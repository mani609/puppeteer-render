const puppeteer = require("puppeteer");
require("dotenv").config();

const scrapeRecipes = async (res) => {
  const browser = await puppeteer.launch({
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });
  try {
    const page = await browser.newPage();


    const startWeek = 19;
    await page.goto('https://www.hellofresh.at/menus/2025-W'+startWeek);
    const recipes = [];
  
    // Alle Teaser-Elemente selektieren
    const teaserSelector = '[data-test-id="recipe-card-component"]';
    const teaserCount = (await page.$$(teaserSelector)).length;
    console.log('Anzahl der Teaser:', teaserCount);



  // API Abfrage abfangen
  page.on('response', async (response) => {
    if (response.url().includes('recipe-detail') && response.url().includes('.json')) {
        try { 
            const responseJSON = await response.json(); // 🔥 Hier bekommst du die Daten

            const recipeData = extractRecipeData(responseJSON);
            recipes.push(recipeData);
            console.log('✅ Rezept erfolgreich hinzugefügt');
      
            // Hier kannst du z. B. speichern, verarbeiten, extrahieren usw.
          } catch (err) {
            console.error('❌ Fehler beim Parsen der Antwort:', err);
          }
    }
  });

  // Funktion, die bestimmte Teile des JSON extrahiert und ein neues JSON erstellt
  function extractRecipeData(responseJSON) {
    try {
      // Extrahiere nur die wichtigen Teile des JSON
        const extractedData = {
            title: responseJSON.pageProps.ssrPayload.recipe.name,
            subline: responseJSON.pageProps.ssrPayload.recipe.headline,
            description: responseJSON.pageProps.ssrPayload.recipe.description,
            image: responseJSON.pageProps.ssrPayload.recipe.imageLink,

            cuisines: responseJSON.pageProps.ssrPayload.recipe.cuisines,
            difficulty: responseJSON.pageProps.ssrPayload.recipe.difficulty,
            time: responseJSON.pageProps.ssrPayload.recipe.totalTime,
            tags: responseJSON.pageProps.ssrPayload.recipe.tags,

            ingredients: responseJSON.pageProps.ssrPayload.recipe.ingredients,
            steps: responseJSON.pageProps.ssrPayload.recipe.steps,
            utensils: responseJSON.pageProps.ssrPayload.recipe.utensils,

            // Hier kannst du noch weitere relevante Felder hinzufügen
        };

        // ingredient amounts is not yet stored in ingredients but in yields - therefore we have to add the yield information to each ingredient (use for default 2 servings)
        const yields = responseJSON.pageProps.ssrPayload.recipe.yields;
        if (yields && yields[0] && yields[0]["ingredients"]) {
            // merge ingredients and yields
            const servings = yields[0]["yields"];
            const yieldIngredients = yields[0]["ingredients"];
            
            mergedIngredients = yieldIngredients.map(yieldIng => {
                const fullInfo = extractedData.ingredients.find(ing => ing.id === yieldIng.id);
            
                if (fullInfo) {
                return {
                    ...fullInfo,
                    amount: yieldIng.amount,
                    unit: yieldIng.unit,
                    servings: servings
                };
                } else {
                console.warn('❌ Fehler beim Zusammenführen der Zutaten: Keine passende Zutat gefunden für ID:', yieldIng.id);
                return yieldIng; // Fallback: nur amount/unit
                }
            });

            extractedData.ingredients = mergedIngredients;
        }
        else {
            console.log('❌ Keine gültigen Portionen extrahiert.');
        }

        if (!extractedData) {
            console.log('❌ Keine gültigen Rezeptdaten extrahiert.');
        }
  
        return extractedData; // Neues JSON mit nur den gewünschten Teilen
    
    } catch (err) {
      console.error('❌ Fehler beim Extrahieren der Daten:', err);
      return null; // Wenn etwas schiefgeht, null zurückgeben
    }
  }

  // fetch each teaaser
  for (let i = 0; i < teaserCount; i++) {
    console.log(`➡️ Öffne Teaser #${i + 1}`);


    const currentTeasers = await page.$$(teaserSelector);
    const teaser = currentTeasers[i];

    if (!teaser) {
        console.warn(`⚠️ Teaser #${i + 1} nicht gefunden – möglicherweise DOM geändert.`);
        continue;
    }

    await Promise.all([
        teaser.click(),
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
    ]);

    console.log('🔙 Zurück zur Startseite');
    await page.goBack({ waitUntil: 'networkidle2' });
  
    // Sicherstellen, dass Seite neu geladen wurde
    await page.waitForSelector(teaserSelector);
    await new Promise(resolve => setTimeout(resolve, 1000));
}


console.log('********');
console.log(recipes.length+' von '+teaserCount+' abgerufen');

    const recipeData = JSON.stringify(recipes, null, 2);

    
    res.send(recipeData);
  } catch (e) {
    console.error(e);
    res.send(`Something went wrong while running Puppeteer: ${e}`);
  } finally {
    await browser.close();
  }
};

module.exports = { scrapeRecipes };
