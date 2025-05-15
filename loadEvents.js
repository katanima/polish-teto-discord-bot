import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function loadEvents(client) {
    const eventsPath = path.join(__dirname, 'events');
    
    if (!fs.existsSync(eventsPath)) {
      console.log('Katalog zdarzeń nie istnieje.');
    }
    
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file);
      const fileURL = `file://${filePath}`;
      
      try {
        const event = await import(fileURL);
        
        if (event.once) {
          client.once(event.name, (...args) => event.execute(client, ...args));
        } else {
          client.on(event.name, (...args) => event.execute(client, ...args));
        }
        
        console.log(`Załadowano zdarzenie: ${event.name}`);
      } catch (error) {
        console.error(`Błąd podczas ładowania zdarzenia z pliku ${file}:`, error);
      }
    }
  }