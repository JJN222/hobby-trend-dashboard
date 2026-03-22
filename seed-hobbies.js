/**
 * Re-seed the hobbies table with the full expanded list.
 * Run: node server/scripts/seed-hobbies.js
 *
 * Safe to run multiple times -- uses ON CONFLICT DO UPDATE
 * so it'll update keywords/hashtags for existing hobbies
 * without touching snapshot data.
 */

const pool = require("./server/db/pool");
require("dotenv").config({ path: "./server/.env" });

const HOBBIES = [
  // ─── CRAFTS & MAKING ───
  {
    name: "Pottery / Ceramics",
    category: "Crafts",
    keywords: ["pottery wheel", "ceramics tutorial", "pottery for beginners", "throwing on the wheel", "hand building pottery", "glazing ceramics"],
    tiktok_hashtags: ["#pottery", "#ceramics", "#potterywheel", "#potterytok", "#ceramicart", "#throwingpottery"],
  },
  {
    name: "Crochet",
    category: "Crafts",
    keywords: ["crochet tutorial", "crochet for beginners", "crochet pattern", "granny square", "amigurumi", "crochet top"],
    tiktok_hashtags: ["#crochet", "#crochettok", "#crochetpattern", "#amigurumi", "#crochettutorial", "#grannysquare"],
  },
  {
    name: "Knitting",
    category: "Crafts",
    keywords: ["knitting tutorial", "knitting for beginners", "knitting pattern", "knit sweater", "knitting needles"],
    tiktok_hashtags: ["#knitting", "#knittok", "#knittingtutorial", "#knittersofinstagram", "#handknit"],
  },
  {
    name: "Embroidery",
    category: "Crafts",
    keywords: ["embroidery tutorial", "hand embroidery", "embroidery for beginners", "punch needle embroidery", "embroidery hoop"],
    tiktok_hashtags: ["#embroidery", "#embroiderytok", "#handembroidery", "#embroiderytutorial", "#stitching"],
  },
  {
    name: "Rug Tufting",
    category: "Crafts",
    keywords: ["rug tufting", "tufting gun", "custom rug", "rug making tutorial", "tufting for beginners"],
    tiktok_hashtags: ["#rugtufting", "#tuftinggun", "#rugmaking", "#tuftingtok", "#customrug"],
  },
  {
    name: "Punch Needle",
    category: "Crafts",
    keywords: ["punch needle", "punch needle tutorial", "punch needle for beginners", "punch needle rug", "punch needle embroidery"],
    tiktok_hashtags: ["#punchneedle", "#punchneedletok", "#punchneedleembroidery", "#punchneedleart"],
  },
  {
    name: "Calligraphy",
    category: "Crafts",
    keywords: ["calligraphy tutorial", "modern calligraphy", "brush lettering", "calligraphy for beginners", "hand lettering"],
    tiktok_hashtags: ["#calligraphy", "#calligraphytok", "#handlettering", "#brushlettering", "#moderncalligraphy"],
  },
  {
    name: "Soap Making",
    category: "Crafts",
    keywords: ["soap making", "cold process soap", "handmade soap", "soap making tutorial", "soap cutting"],
    tiktok_hashtags: ["#soapmaking", "#soaptok", "#handmadesoap", "#coldprocesssoap", "#soapcutting", "#soapasmr"],
  },
  {
    name: "Candle Making",
    category: "Crafts",
    keywords: ["candle making", "soy candles", "candle making tutorial", "candle business", "homemade candles"],
    tiktok_hashtags: ["#candlemaking", "#candletok", "#soycandles", "#candlebusiness", "#handmadecandles"],
  },
  {
    name: "Resin Art",
    category: "Crafts",
    keywords: ["resin art", "epoxy resin", "resin tutorial", "resin pour", "resin jewelry", "resin table"],
    tiktok_hashtags: ["#resinart", "#epoxyresin", "#resintok", "#resinpour", "#resinjewelry", "#resincraft"],
  },
  {
    name: "Origami",
    category: "Crafts",
    keywords: ["origami tutorial", "origami for beginners", "paper folding", "modular origami", "origami crane"],
    tiktok_hashtags: ["#origami", "#origamitok", "#paperfolding", "#origamitutorial", "#origamiart"],
  },
  {
    name: "Woodworking",
    category: "Crafts",
    keywords: ["woodworking", "woodworking for beginners", "woodworking projects", "diy wood projects", "woodturning", "carpentry"],
    tiktok_hashtags: ["#woodworking", "#woodworkingtok", "#woodwork", "#woodturning", "#carpentry", "#diywood"],
  },
  {
    name: "Model Building",
    category: "Crafts",
    keywords: ["model building", "scale model", "model kit", "miniature painting", "diorama", "warhammer painting"],
    tiktok_hashtags: ["#modelbuilding", "#scalemodel", "#miniaturepainting", "#diorama", "#warhammer", "#modelkit"],
  },
  {
    name: "Digital Illustration",
    category: "Crafts",
    keywords: ["digital illustration", "procreate tutorial", "digital art tutorial", "ipad drawing", "digital painting", "illustration tips"],
    tiktok_hashtags: ["#digitalart", "#procreate", "#digitalillustration", "#arttok", "#ipadart", "#digitalpainting"],
  },
  {
    name: "Restoring Antiques",
    category: "Crafts",
    keywords: ["antique restoration", "furniture restoration", "restoring old furniture", "vintage restoration", "refinishing furniture"],
    tiktok_hashtags: ["#restoration", "#antique", "#furniturerestoration", "#restore", "#restorationtok", "#beforeandafter"],
  },
  {
    name: "Upcycling",
    category: "Crafts",
    keywords: ["upcycling", "upcycle furniture", "thrift flip", "upcycling ideas", "repurpose", "diy upcycle"],
    tiktok_hashtags: ["#upcycling", "#upcycle", "#thriftflip", "#repurpose", "#upcyclingideas", "#sustainablecraft"],
  },
  {
    name: "Thrifting / Thrift Flips",
    category: "Crafts",
    keywords: ["thrift flip", "thrifting haul", "thrift store finds", "thrift with me", "goodwill finds", "thrift flip clothes"],
    tiktok_hashtags: ["#thriftflip", "#thrifting", "#thrifttok", "#thrifthaul", "#thriftwithme", "#goodwillfinds"],
  },
  {
    name: "3D Printing",
    category: "Tech",
    keywords: ["3d printing", "3d printer", "3d printing projects", "3d printing for beginners", "resin printing", "ender 3"],
    tiktok_hashtags: ["#3dprinting", "#3dprinter", "#3dprintingtok", "#3dprint", "#resinprint", "#maker"],
  },

  // ─── SPORTS & MOVEMENT ───
  {
    name: "Pickleball",
    category: "Sports",
    keywords: ["pickleball", "pickleball tips", "pickleball paddle", "pickleball rules", "pickleball for beginners", "pickleball drills"],
    tiktok_hashtags: ["#pickleball", "#pickleballtok", "#pickleballtips", "#pickleballlife", "#pickleballislife"],
  },
  {
    name: "Bouldering / Rock Climbing",
    category: "Sports",
    keywords: ["bouldering", "rock climbing", "climbing gym", "bouldering tips", "indoor climbing", "climbing for beginners"],
    tiktok_hashtags: ["#bouldering", "#rockclimbing", "#climbing", "#climbtok", "#bouldertok", "#climbingym"],
  },
  {
    name: "Martial Arts",
    category: "Sports",
    keywords: ["martial arts", "bjj", "muay thai", "martial arts for beginners", "boxing training", "mma training"],
    tiktok_hashtags: ["#martialarts", "#bjj", "#muaythai", "#boxing", "#mma", "#martialartstok"],
  },
  {
    name: "Disc Golf",
    category: "Sports",
    keywords: ["disc golf", "disc golf tips", "frisbee golf", "disc golf course", "disc golf for beginners"],
    tiktok_hashtags: ["#discgolf", "#discgolftok", "#frisbeegolf", "#discgolflife", "#discgolfeveryday"],
  },
  {
    name: "Wild Swimming",
    category: "Sports",
    keywords: ["wild swimming", "open water swimming", "cold water swimming", "cold plunge", "ice bath", "outdoor swimming"],
    tiktok_hashtags: ["#wildswimming", "#coldwaterswimming", "#coldplunge", "#icebath", "#openwater", "#coldwatertok"],
  },
  {
    name: "Tai Chi",
    category: "Sports",
    keywords: ["tai chi", "tai chi for beginners", "tai chi tutorial", "qigong", "tai chi exercise"],
    tiktok_hashtags: ["#taichi", "#taichitok", "#qigong", "#taichipractice", "#movingmeditation"],
  },
  {
    name: "Geocaching",
    category: "Sports",
    keywords: ["geocaching", "geocache", "geocaching tips", "treasure hunting gps", "geocaching for beginners"],
    tiktok_hashtags: ["#geocaching", "#geocache", "#geocachingtok", "#treasurehunt", "#geocachingadventures"],
  },

  // ─── FOOD & DRINK ───
  {
    name: "Sourdough Baking",
    category: "Food",
    keywords: ["sourdough bread", "sourdough starter", "bread baking", "sourdough recipe", "sourdough for beginners"],
    tiktok_hashtags: ["#sourdough", "#sourdoughbread", "#breadtok", "#sourdoughstarter", "#breadbaking"],
  },
  {
    name: "Fermentation",
    category: "Food",
    keywords: ["fermentation", "fermenting vegetables", "kombucha", "kimchi recipe", "fermented foods", "lacto fermentation"],
    tiktok_hashtags: ["#fermentation", "#fermentedfoods", "#kombucha", "#kimchi", "#guthealth", "#fermenttok"],
  },
  {
    name: "Home Brewing",
    category: "Food",
    keywords: ["home brewing", "homebrew beer", "brewing beer at home", "homebrewing for beginners", "craft beer brewing"],
    tiktok_hashtags: ["#homebrew", "#homebrewing", "#brewtok", "#craftbeer", "#homebrewbeer"],
  },
  {
    name: "Coffee Roasting",
    category: "Food",
    keywords: ["coffee roasting", "home coffee roasting", "roast your own coffee", "specialty coffee", "pour over coffee", "coffee brewing"],
    tiktok_hashtags: ["#coffeeroasting", "#coffeetok", "#specialtycoffee", "#homebarista", "#pourover", "#coffeelover"],
  },

  // ─── OUTDOORS & NATURE ───
  {
    name: "Mushroom Foraging",
    category: "Outdoors",
    keywords: ["mushroom foraging", "wild mushrooms", "foraging guide", "mushroom identification", "mycology", "foraging for beginners"],
    tiktok_hashtags: ["#mushroomforaging", "#foraging", "#mycology", "#mushrooms", "#wildfood", "#foragingtok"],
  },
  {
    name: "Beekeeping",
    category: "Outdoors",
    keywords: ["beekeeping", "beekeeping for beginners", "backyard bees", "honey harvest", "bee hive", "apiary"],
    tiktok_hashtags: ["#beekeeping", "#bees", "#beetok", "#honeybees", "#apiary", "#beehive", "#honeyharvest"],
  },
  {
    name: "Birdwatching",
    category: "Outdoors",
    keywords: ["birdwatching", "birding", "bird identification", "backyard birds", "birdwatching for beginners", "merlin bird id"],
    tiktok_hashtags: ["#birdwatching", "#birding", "#birdtok", "#birdsoftiktok", "#birdphotography", "#backyardbirds"],
  },
  {
    name: "Seed Saving",
    category: "Outdoors",
    keywords: ["seed saving", "save seeds", "heirloom seeds", "seed starting", "seed saving for beginners", "garden seeds"],
    tiktok_hashtags: ["#seedsaving", "#seedstarting", "#gardentok", "#heirloomseeds", "#gardeningtok"],
  },
  {
    name: "Houseplant Care",
    category: "Outdoors",
    keywords: ["houseplant care", "indoor plants", "plant care tips", "rare houseplants", "plant propagation", "plant tour"],
    tiktok_hashtags: ["#houseplants", "#planttok", "#plantcare", "#indoorplants", "#plantparent", "#rareplants", "#propagation"],
  },
  {
    name: "Amateur Astronomy",
    category: "Outdoors",
    keywords: ["amateur astronomy", "telescope for beginners", "stargazing", "astrophotography", "night sky photography"],
    tiktok_hashtags: ["#astronomy", "#telescope", "#stargazing", "#astrophotography", "#nightsky", "#astrotok"],
  },

  // ─── GAMES & SOCIAL ───
  {
    name: "Chess",
    category: "Games",
    keywords: ["chess", "chess openings", "chess tutorial", "chess for beginners", "chess strategy", "chess tactics"],
    tiktok_hashtags: ["#chess", "#chesstok", "#chessgame", "#chessmaster", "#chessopenings", "#learnchess"],
  },
  {
    name: "Dungeons & Dragons",
    category: "Games",
    keywords: ["dungeons and dragons", "dnd", "d&d", "dnd campaign", "dungeon master tips", "dnd for beginners", "ttrpg"],
    tiktok_hashtags: ["#dnd", "#dungeonsanddragons", "#dndtok", "#ttrpg", "#dnd5e", "#dungeonmaster"],
  },
  {
    name: "Board Games",
    category: "Games",
    keywords: ["board games", "board game review", "tabletop games", "best board games", "board game night", "strategy games"],
    tiktok_hashtags: ["#boardgames", "#boardgametok", "#tabletopgames", "#boardgamenight", "#boardgamereview"],
  },
  {
    name: "Jigsaw Puzzles",
    category: "Games",
    keywords: ["jigsaw puzzle", "puzzle time lapse", "1000 piece puzzle", "puzzle tips", "puzzle haul"],
    tiktok_hashtags: ["#jigsawpuzzle", "#puzzletok", "#puzzle", "#puzzletime", "#jigsawpuzzles"],
  },

  // ─── COLLECTING & MEDIA ───
  {
    name: "Vinyl Collecting",
    category: "Collecting",
    keywords: ["vinyl records", "record collecting", "vinyl collection", "turntable setup", "vinyl haul", "record store"],
    tiktok_hashtags: ["#vinyl", "#vinylcollection", "#vinyltok", "#records", "#vinylrecords", "#recordcollection"],
  },
  {
    name: "Film Photography",
    category: "Collecting",
    keywords: ["film photography", "35mm film", "film camera", "analog photography", "film photography for beginners", "developing film"],
    tiktok_hashtags: ["#filmphotography", "#35mm", "#filmcamera", "#analog", "#shootfilm", "#filmisnotdead"],
  },
  {
    name: "Metal Detecting",
    category: "Collecting",
    keywords: ["metal detecting", "metal detector finds", "treasure hunting", "metal detecting tips", "beach metal detecting"],
    tiktok_hashtags: ["#metaldetecting", "#metaldetector", "#treasurehunting", "#metaldetectingtok", "#detecting"],
  },
  {
    name: "Aquarium Keeping",
    category: "Collecting",
    keywords: ["aquarium", "fish tank", "aquascaping", "planted tank", "reef tank", "aquarium for beginners", "fish keeping"],
    tiktok_hashtags: ["#aquarium", "#fishtok", "#aquascaping", "#plantedtank", "#reeftank", "#fishkeeping"],
  },

  // ─── LIFESTYLE & LEARNING ───
  {
    name: "Journaling / Bullet Journal",
    category: "Lifestyle",
    keywords: ["bullet journal", "journaling", "bujo setup", "journal with me", "journaling prompts", "planner setup"],
    tiktok_hashtags: ["#bulletjournal", "#journaling", "#bujo", "#journaltok", "#journalwithme", "#bujoideas"],
  },
  {
    name: "Book Clubs / BookTok",
    category: "Lifestyle",
    keywords: ["book recommendations", "booktok", "book review", "reading list", "book haul", "book club picks"],
    tiktok_hashtags: ["#booktok", "#bookclub", "#bookrecommendations", "#bookish", "#currentlyreading", "#bookhaul"],
  },
  {
    name: "Genealogy",
    category: "Lifestyle",
    keywords: ["genealogy", "family history", "ancestry dna", "family tree", "genealogy research", "dna test results"],
    tiktok_hashtags: ["#genealogy", "#familyhistory", "#ancestry", "#dna", "#familytree", "#genealogytok"],
  },
  {
    name: "Lock Picking",
    category: "Lifestyle",
    keywords: ["lock picking", "lock sport", "lock picking tutorial", "pick a lock", "locksmith", "lock picking for beginners"],
    tiktok_hashtags: ["#lockpicking", "#locksport", "#lockpickingtok", "#locks", "#locksmith"],
  },
  {
    name: "Drone Photography",
    category: "Tech",
    keywords: ["drone photography", "fpv drone", "drone footage", "drone for beginners", "dji mini", "aerial photography"],
    tiktok_hashtags: ["#dronephotography", "#fpv", "#droneshots", "#dronetok", "#dji", "#aerialphotography"],
  },
  {
    name: "Puppetry",
    category: "Crafts",
    keywords: ["puppetry", "puppet making", "hand puppet", "marionette", "puppet show", "puppet tutorial"],
    tiktok_hashtags: ["#puppetry", "#puppet", "#puppettok", "#puppetmaking", "#handpuppet"],
  },
];

async function main() {
  console.log(`Seeding ${HOBBIES.length} hobbies...\n`);

  let added = 0;
  let updated = 0;

  for (const hobby of HOBBIES) {
    const result = await pool.query(
      `INSERT INTO hobbies (name, category, keywords, tiktok_hashtags)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (name) DO UPDATE SET
         category = EXCLUDED.category,
         keywords = EXCLUDED.keywords,
         tiktok_hashtags = EXCLUDED.tiktok_hashtags
       RETURNING (xmax = 0) AS is_new`,
      [hobby.name, hobby.category, hobby.keywords, hobby.tiktok_hashtags]
    );

    const isNew = result.rows[0]?.is_new;
    if (isNew) {
      added++;
      console.log(`  + ${hobby.name} (${hobby.category})`);
    } else {
      updated++;
      console.log(`  ~ ${hobby.name} (updated keywords)`);
    }
  }

  console.log(`\nDone: ${added} added, ${updated} updated, ${HOBBIES.length} total.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
