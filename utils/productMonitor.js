import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

import cron from 'node-cron';
import { appendFile, readFile, writeFile } from 'fs/promises';
import { onePLNtoYEN } from './currencyMonitor.js';
import { EmbedBuilder } from 'discord.js';
import { broadcastMessages } from './broadcast.js';
const refreshRate = "10";
let previousProductList = [];

export const url = "https://www.amiami.com/eng/search/list/?s_st_list_preorder_available=1&s_st_list_backorder_available=1&s_st_list_newitem_available=1&s_st_condition_flg=1&s_keywords=touhou%20plush&pagecnt=";


const getProductListFromSite = async (html) => {
  const productList = [];

  if (!html) {
    console.error('Brak HTML — możliwe zablokowanie przez stronę.');
    return [];
  }

  const $ = cheerio.load(html);
  //console.log("Pobrany tytuł strony:", $("title").text());

  const amountOfProductsOnPage = parseInt($(".search-result__text").text().split(" ")[2].trim());

  const products = $(".newly-added-items__item > a");
  products.each((i, product) => {
    const name = $(product).find(".newly-added-items__item__name").text().trim();
    const tagList = $(product).find("ul.newly-added-items__item__tag-list");
    const visibleTag = tagList.children("li").filter((j, li) => {
      const style = $(li).attr("style") || "";
      return !style.includes("display: none");
    }).text().trim();

    const priceElement = $(product).find(".newly-added-items__item__price");
    priceElement.find("span").remove();
    const price = priceElement.text().trim();

    const image = $(product).find("img").attr("src");
    const link = "https://www.amiami.com" + $(product).attr("href");

    productList.push({ name, state: visibleTag, price, image, link });
  });

  return { productList, amountOfProductsOnPage };
}

const getFullProductList = async () => {
  let fullProductList = [];
  let totalAmountOfProducts = 0;

  puppeteer.use(StealthPlugin())
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const page = await browser.newPage();

  try {
    for (let i = 1; i < 9; i++) {
      let html;
      let errorExists = false;
      let attempts = 7;
      do {
        attempts--;
        if (attempts == 0)
          throw new Error("Gówno się zapchało. Jebać to. Zrywam połączenie, elo.");

        await page.goto(url + i, { waitUntil: 'networkidle2', timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 1500));
        html = await page.content();
        const $ = cheerio.load(html);
        errorExists = $("h2.item-detail__error-title").length > 0;

        if (errorExists) {
          console.log("Wykryto stronę błędu, ponawiam próbę...");
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {     
          if($(".new-items__inner").children().length === 0) //is last page?
            return { fullProductList, totalAmountOfProducts }
        }
      } while (errorExists);

      await new Promise(resolve => setTimeout(resolve, 1500));
      const { productList, amountOfProductsOnPage } = await getProductListFromSite(html);

      if(amountOfProductsOnPage > totalAmountOfProducts)
        totalAmountOfProducts = amountOfProductsOnPage;

      fullProductList = fullProductList.concat(productList);
    }
    return { fullProductList, totalAmountOfProducts: -1 }

  } catch (error) {
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

const getNewlyAddedProducts = async () => {
  const { fullProductList, totalAmountOfProducts } = await getFullProductList();
  const newProducts = fullProductList.filter(product =>
    !previousProductList.some(old => old.name === product.name)
  );

  if(fullProductList.length === totalAmountOfProducts) {
    previousProductList = fullProductList;
  } else {
    throw new Error(`Elementy w liście (${fullProductList.length}. Spodziewanych elementów (${totalAmountOfProducts})`);
  }
  
  return newProducts;
}

async function doesRegistryExists(registry) {
  try {
    const file = await readFile(global.NOTIFICATION_FILE, 'utf-8');
    const lines = file.split('\n').map(l => l.trim());
    return lines.includes(registry.trim());

  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`Plik ${global.NOTIFICATION_FILE} nie istnieje. Tworzę nowy...`);
      await writeFile(global.NOTIFICATION_FILE, '', 'utf-8');
      return false;
    } else {
      throw error;
    }
  }
}

export async function addChannelToNotificationList(guildId, channelId) {
  const registry = `${global.NOTIFICATION_CODE.AMIAMI_NEW_FUMOS} ${guildId} ${channelId}`;

  if (!(await doesRegistryExists(registry))) {
    await appendFile(global.NOTIFICATION_FILE, "\n" + registry, "utf-8");
    return "success";
  } else {
    return "failed";
  }
}

export async function disableChannelFromNotificationList(guildId, channelId) {
  const registry = `${global.NOTIFICATION_CODE.AMIAMI_NEW_FUMOS} ${guildId} ${channelId}`;

  try {
    const content = await readFile(global.NOTIFICATION_FILE, 'utf-8');
    const lines = content.split('\n');
    console.log(registry);
    console.log(lines);

    const filtered = lines.filter(line => line !== registry);
    console.log(filtered);

    if (lines.length === filtered.length) {
      return "failed";
    }

    await writeFile(global.NOTIFICATION_FILE, filtered.join('\n'), 'utf-8');
    return "success";
  } catch (err) {
    console.error('Błąd przy usuwaniu z pliku:', err);
    return "error";
  }
}

export async function initProductMonitor(client) {
  //initCurrencyMonitor();

  console.log(`Sprawdzanie monitorowanych produktów...`);
  try {
    await getNewlyAddedProducts().then(productList => {
      console.log(`DOSTĘPNYCH FUMOSÓW ==> ${productList.length}\n`);
    });
  } catch (error) {
    console.error("Błąd przy pobieraniu nowych produktów:", error);
    console.error("ZAMYKAM MONITOR W PIZDU");
    return;
  }
  console.log("Pomyślnie aktywowano monitor fumosów.");
  
  cron.schedule(`*/${refreshRate} * * * *`, async () => {
    const now = new Date();
    console.log(`Sprawdzanie monitorowanych produktów... [${now.toLocaleString()}]`);
  
    let retries = 3;
    while (retries > 0) {
      try {
        const productList = await getNewlyAddedProducts();
        console.log(`NOWYCH FUMOSÓW ==> ${productList.length}\n`);
  
        if (productList.length > 0) {
          await broadcastMessages(
            global.NOTIFICATION_CODE.AMIAMI_NEW_FUMOS,
            client,
            async (channel, list) => {
              for (const product of list) {
                const price = parseInt(product.price.replace(",", ""));
                const pricePLN = (price / onePLNtoYEN).toFixed(2);
  
                const embed = new EmbedBuilder()
                  .setTitle(product.name)
                  .setURL(product.link)
                  .setDescription(`${product.state}\n${price} JPY ≈ ${pricePLN} PLN`)
                  .setImage(product.image)
                  .setColor(0xff66aa);
  
                await channel.send({ embeds: [embed] });
              }
            },
            productList
          );
        }
        break;
      } catch (error) {
        console.error(`Błąd przy pobieraniu nowych produktów (pozostało prób: ${retries - 1}):`, error);
        retries--;
  
        if (retries === 0) {
          console.error("Wszystkie próby nieudane. Pomijam ten cykl cron.");
        } else {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }
  });  
}