import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

import cron from 'node-cron';
import { appendFile, readFile, writeFile } from 'fs/promises';
import { onePLNtoYEN } from './currencyMonitor.js';
import { EmbedBuilder } from 'discord.js';
import { broadcastMessages } from './broadcast.js';
const refreshRate = "5";
let previousProductList = [];

export const url = "https://www.amiami.com/eng/search/list/?s_st_list_preorder_available=1&s_st_list_backorder_available=1&s_st_list_newitem_available=1&s_st_condition_flg=1&s_keywords=touhou%20plush&pagecnt=";


const getProductListFromSite = async ($, ProperAmountOfProducts) => {
  const productList = [];
  //console.log("Pobrany tytuł strony:", $("title").text());

  const amountOfProductsOnThisPage = await checkAmountOfProducts($);
  if (ProperAmountOfProducts !== amountOfProductsOnThisPage)
    throw Error(`Element z informacją o ilości produktów na stronie nie zgadza się z otrzymaną wartością. Spodziewana ilość (${ProperAmountOfProducts}) Wykryto (${amountOfProductsOnThisPage})`)

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

  return productList;
}

const scanWebsiteInSearchOfErrors = async ($) => {
  if ($("h2.item-detail__error-title").length > 0)
    throw Error("error-page");
  if ($(".new-items__inner").children().length === 0)
    throw Error("empty-list");
}

const checkAmountOfProducts = async ($) => {
  const element = $(".search-result__text").text();
  if (element === "")
    throw Error("Element jest pusty.");

  return parseInt(element.split(" ")[2].trim());
}

const getCheerio = async (page, url) => {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 7000 });
  await page.waitForSelector('.nomore', { timeout: 3000 });
  const html = await page.content();
  return cheerio.load(html)
}

const getFullProductList = async () => {
  let fullProductList = [];

  puppeteer.use(StealthPlugin());
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const page = await browser.newPage();

  try {
    let amountOfPages;
    let amountOfProducts;
    let $;
    let errorExists;
    let attempts = 7;
    const productsPerPage = 20;
    do {
      errorExists = false;
      attempts--;
      if (attempts === 0) throw new Error("Gówno się zapchało. Jebać to. Zrywam połączenie, elo.");
      try {
        $ = await getCheerio(page, url + 1);
        amountOfProducts = await checkAmountOfProducts($);
        amountOfPages = amountOfProducts / productsPerPage + 1;
      } catch (error) {
        errorExists = true;
        console.log(`Wykryto błędną strone: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } while (errorExists)

    for (let i = 1; i <= amountOfPages; i++) {
      let errorExists;
      let attempts = 7;
      do {
        errorExists = false;
        attempts--;
        if (attempts === 0) throw new Error("Gówno się zapchało. Jebać to. Zrywam połączenie, elo.");

        try {
          if (i !== 1) {
            $ = await getCheerio(page, url + i);
          }
          await scanWebsiteInSearchOfErrors($);
          const productList = await getProductListFromSite($, amountOfProducts);
          fullProductList = fullProductList.concat(productList);

        } catch (error) {
          errorExists = true;
          console.log(`Wykryto błędną strone: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } while (errorExists);
    }
    return { fullProductList, amountOfProducts }

  } catch (error) {
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

const getNewlyAddedProducts = async () => {
  const { fullProductList, amountOfProducts } = await getFullProductList();
  const newProducts = fullProductList.filter(product =>
    !previousProductList.some(old => old.name === product.name)
  );

  if (fullProductList.length === amountOfProducts) {
    previousProductList = fullProductList;
  } else {
    throw new Error(`Elementy w liście (${fullProductList.length}). Spodziewanych elementów (${amountOfProducts})`);
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
    const filtered = lines.filter(line => line !== registry);

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
        console.error(`Błąd przy pobieraniu nowych produktów: ${error?.message ?? String(error)}`);
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