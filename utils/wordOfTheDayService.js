import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

import cron from 'node-cron';
import { broadcastMessages } from './broadcast.js';

const hourOfUpdate = "7";

const getHTML = async () => {
  let html;

  puppeteer.use(StealthPlugin());
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const page = await browser.newPage();
  try {
    await page.goto("https://wyliczanie.pl/generator-losowych-slow", { waitUntil: 'networkidle2', timeout: 10000 });

    await page.$$eval("strong", elements => {
      const match = elements.find(el => el.textContent.trim() === "rzeczownik");
      if (match) match.click();
    });
    await new Promise(resolve => setTimeout(resolve, 100));
    await page.type("input#ilosc", "1");
    await page.click("input[alt='generuj słowa']");
    await new Promise(resolve => setTimeout(resolve, 500));
    html = await page.content();
  } catch (error) {
    throw error;
  } finally {
    await page.close();
  }
  return html;
}

const getWordOfTheDay = async () => {
  const html = await getHTML();
  const $ = cheerio.load(html);
  return $("span.wylosowane-slowo").text();
}

export const initWordOfTheDayService = async (client) => {
  cron.schedule(`0 ${hourOfUpdate} * * *`, async () => {
    const now = new Date();
    console.log(`Losowanie słowa dnia... [${now.toLocaleString()}]`);

    try {
      const word = await getWordOfTheDay();
      console.log(`Wylosowane słowo dnia >>> ${word}`)
      if(word) {
        broadcastMessages( global.NOTIFICATION_CODE.TETO_WORD_OF_THE_DAY,
          client,
          async (channel) => {
            await channel.send(`Słowo dnia Kaśki ||${word}||`);
        });
      }

    } catch (error) {
      console.error("Błąd przy losowaniu słowa dnia:", error.message);
    }
  });
  console.log("Zainicjalizowano wordOfTheDayService.")
}