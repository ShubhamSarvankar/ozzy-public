require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const gotwModel = require('../models/gotwSchema');

const database = process.env.MONGODB_SRV;

const commands = [
  {
    trigger: '1d',
    responses: ['ONE DIRECTION FTW WOOP WOOP <:catluv:830173621238235156> <:EH:545675680352960532> <:EH:545675680352960532>']
  },
  {
    trigger: 'ao',
    responses: ['Donate to Aoao in <#653287109519736832>']
  },
  {
    trigger: 'archana',
    responses: ['shut up and gib me food']
  },
  {
    trigger: 'back',
    responses: ['BACK🤺 BACK🤺 I SAY']
  },
  {
    trigger: 'banalex',
    responses: ['✅ `Case #6004` <@1118496445130092584> has been banned from the server.']
  },
  {
    trigger: 'banchoco',
    responses: [':white_check_mark: `Case #9772` <@558429439684247562> has been banned for eternity.']
  },
  {
    trigger: 'bandan',
    responses: ['✅ `Case #5804` <@673930439173341239> has been banned for eternity.']
  },
  {
    trigger: 'banender',
    responses: [':white_check_mark: `Case #6969` <@1028160451957243995> has been banned for eternity.']
  },
  {
    trigger: 'banfoxy',
    responses: [':white_check_mark: `Case #2167` <@537295533895581697> has been banned for eternity.']
  },
  {
    trigger: 'banjak',
    responses: ['✅ `Case #2543` <@730131219848888380> has been banned for eternity.']
  },
  {
    trigger: 'banjavi',
    responses: [':white_check_mark: `Case #0545` <@754862134499999854> has been banned for eternity.']
  },
  {
    trigger: 'banjo',
    responses: [
      '✅ `Case #5804` <@640003973834866693> has been banned for eternity.',
      '🪕'
    ]
  },
  {
    trigger: 'bannight',
    responses: [':white_check_mark: `Case #6155` <@818426541624393768> has been banned for eternity.']
  },
  {
    trigger: 'banpanda',
    responses: ['✅ `Case #8431` <@714512199523237938> has been banned for eternity.']
  },
  {
    trigger: 'banxtra',
    responses: ['✅ Case #8811 <@616734300875915311> has been banned for eternity.']
  },
  {
    trigger: 'banyoda',
    responses: [':white_check_mark: `Case #8620` <@451724404141850645> has been banned for eternity.']
  },
  {
    trigger: 'barney',
    responses: ['<@561251425359757314> https://cdn.discordapp.com/attachments/751843909575114883/1192642161741676645/giphy.gif']
  },
  {
    trigger: 'beans',
    responses: ['<@768562638837776444> GO TO SLEEP YOU FILTHY ANIMAL <:mad:751679151836233770>']
  },
  {
    trigger: 'boy',
    responses: [
      'Boy, I sure love Help Force',
      'Elp, you\'re not a boy anymore.',
      '<:boyisurelovehf:1193600010508587138>'
    ]
  },
  {
    trigger: 'cattt',
    responses: ['This is a Cat-astrophe!']
  },
  {
    trigger: 'chandler',
    responses: ['I’d agree with you, but then we’d both be wrong.']
  },
  {
    trigger: 'chlo',
    responses: ['Did someone say chaos? <:hell:704771826902892574>']
  },
  {
    trigger: 'coconut',
    responses: ['https://cdn.discordapp.com/attachments/1256130653443981322/1256176974871924798/image.png']
  },
  {
    trigger: 'cricket-noises',
    responses: ['*chirp* *chirp* *chirp*']
  },
  {
    trigger: 'crispy',
    responses: ['CHICKN IS FRIEND NOT FOOD!!!']
  },
  {
    trigger: 'diwix',
    responses: ['IT\'S NOT ME, IT\'S MY INTERNET <:cutesob:756885988105781288>']
  },
  {
    trigger: 'elp',
    responses: ['OH NO! :scream_cat:\n\n*Anyway...* :smile_cat:']
  },
  {
    trigger: 'evans',
    responses: ['I dont wike it']
  },
  {
    trigger: 'flop',
    responses: ['https://tenor.com/view/rims-rolling-wheel-silly-idiot-gif-7842420']
  },
  {
    trigger: 'fluff',
    responses: [
      'https://media.discordapp.net/attachments/1127004346605908058/1127693604853395537/canva-free-cute-funny-cat-mug-cup-EFT7PfWWv2c.png?width=588&height=580',
      'https://media.discordapp.net/attachments/1127004346605908058/1127693490093035591/2022-cute-cat-moments.png?width=848&height=580',
      'https://media.discordapp.net/attachments/1127004346605908058/1127693571353481268/best-girl-cat-names-1606245046.png?width=868&height=580',
      'https://media.discordapp.net/attachments/1127004346605908058/1127693722277138582/8835992-cute-cat-smile.png?width=927&height=580',
      'https://media.discordapp.net/attachments/1127004346605908058/1127693915122839562/sSaZSlIgofq_large.png?width=450&height=450',
      'https://cdn.discordapp.com/attachments/1127004346605908058/1127694897483358208/high.png',
      'https://cdn.discordapp.com/attachments/1127004346605908058/1127694932463865876/hd-cute-cat-wallpaper.png',
      'https://media.discordapp.net/attachments/1127004346605908058/1127697060045537370/image.png?width=387&height=580',
      'https://media.discordapp.net/attachments/1127004346605908058/1127697136553824338/338745-1600x1066-kitten-1442857261.png?width=870&height=580',
      'https://media.discordapp.net/attachments/1127004346605908058/1127697576515354735/image.png?width=386&height=580',
      'https://media.discordapp.net/attachments/1127004346605908058/1127697682215997670/image.png?width=577&height=580',
      'https://media.discordapp.net/attachments/1127004346605908058/1127697770489331712/cute-photos-of-cats-in-suitcase-1593184776.png?width=1031&height=580',
      'https://media.discordapp.net/attachments/1127004346605908058/1127697839368187966/kitten-flowers-wallpaper-preview.png?width=910&height=512',
      'https://media.discordapp.net/attachments/1127004346605908058/1127697962613620866/cute20kitten20lying20on20radiator.png?width=1110&height=580',
      'https://media.discordapp.net/attachments/1127004346605908058/1127698003487105175/photo-1591871937573-74dbba515c4c.png?width=870&height=580',
      'https://media.discordapp.net/attachments/1127004346605908058/1127698052405276762/cutest_kitten-Cute_pet_cat_desktop_pictures_1920x1200.png?width=927&height=580',
      'https://media.discordapp.net/attachments/1127004346605908058/1127698212451520573/Cute-Kitten-Wallpaper-Free-Download.png?width=1031&height=580',
      'https://media.discordapp.net/attachments/1127004346605908058/1127698258731487302/wicker-basket-kitten-basket-cats-wallpaper-preview.png?width=910&height=512',
      'https://media.discordapp.net/attachments/1127004346605908058/1127698357909983233/Shaelynn-Wade.png?width=870&height=580',
      'https://media.discordapp.net/attachments/1127004346605908058/1127698465472913508/image.png?width=326&height=580'
    ]
  },
  {
    trigger: 'fox',
    responses: ['https://images-ext-1.discordapp.net/external/V0K1KiF0mXVtNWAjyziIqraDwSOEpkXIeqDWVqraTxw/https/cdn-longterm.mee6.xyz/plugins/embeds/images/545643483243872266/5a4a5d4d9994a3fe7bc10c1293bfcc7aa9d4bd0a4b28da2344ee8041b96bd302.gif?width=562&height=297']
  },
  {
    trigger: 'frog',
    responses: ['<@640139297718272000> WAKE UP AND BOUNCE FROG!']
  },
  {
    trigger: 'frostqueenhf',
    responses: ['The Ice Queen is ready to protect Help Force from any danger!']
  },
  {
    trigger: 'fume',
    responses: ['https://tenor.com/view/bruh-bruh-triggered-bruh-bttv-meme-gif-16887494']
  },
  {
    trigger: 'gn',
    responses: ['Go to bed, sleepy head!!']
  },
  {
    trigger: 'hampterparty',
    responses: ['hampter hampter hampter hampter hampter hampter hampter hampter hampter hampter']
  },
  {
    trigger: 'hannah',
    responses: ['ABSOLUTE DISCRIMINATION']
  },
  {
    trigger: 'harry',
    responses: ['You can’t say fairer than fair enough']
  },
  {
    trigger: 'hbd',
    responses: ['Happy Birthday Help Force! <:EK:545677199915614210> :confetti_ball:']
  },
  {
    trigger: 'hfbf',
    responses: ['HELP FORCE BEST FORCE <:HF:714824354122432534>']
  },
  {
    trigger: 'kofi',
    responses: ['is in her seventh identity crisis of the week']
  },
  {
    trigger: 'mehh',
    responses: ['MEHH but I\'m too lazyyyy <:flop:714824333905625098>']
  },
  {
    trigger: 'honk',
    responses: ['yehs thats grape <:alerthonk:869278988713988097>']
  },
  {
    trigger: 'hster',
    responses: ['i feel like im watching a soap opera but i started halfway through the season so theres no context and nothing makes sense but i love it anyways']
  },
  {
    trigger: 'hype',
    responses: ['https://cdn.discordapp.com/attachments/653298038961340466/1012168129260027944/warbanner2.png']
  },
  {
    trigger: 'ily',
    responses: ['i love you so fucking mcdonalds']
  },
  {
    trigger: 'ineedhelp',
    responses: ['Help will always be given in The Help Force, if you ask for it or need it!']
  },
  {
    trigger: 'jc',
    responses: ['To Bullies: \n 🖐️ Hold your hand out and say STOP IT 🖐️']
  },
  {
    trigger: 'jts',
    responses: ['My name is justnita']
  },
  {
    trigger: 'kermit',
    responses: ['https://tenor.com/view/kermit-kermit-the-frog-tea-tea-day-sipping-tea-gif-15288264']
  },
  {
    trigger: 'meh',
    responses: ['<:E6:545676405447327744>']
  },
  {
    trigger: 'mines',
    responses: ['Right this way <a:mining:913237811094749224>\nhttps://media.discordapp.net/attachments/957602982411763712/1057387488177561730/toTheMines.gif']
  },
  {
    trigger: 'mines1',
    responses: ['https://cdn.discordapp.com/attachments/796421495240654871/1132129897465262110/2f35d4c4-88ef-4169-859f-95a684d1005c.png']
  },
  {
    trigger: 'mintea',
    responses: ['Minty mint tea']
  },
  {
    trigger: 'motivate',
    responses: [
      'Never forget that you are the best!',
      'Stay positive and good things will happen!',
      'All we have is now. Live in the moment!',
      'Whatever you decide to do, make sure it makes you happy!'
    ]
  },
  {
    trigger: 'nafis',
    responses: ['You go to gulag <:sovietmaniac:653370110039293973>']
  },
  {
    trigger: 'start-nap',
    responses: ['<@&911379868619505674> Log on for the Nap Segment! Follow the Host!']
  },
  {
    trigger: 'niko',
    responses: ['Here, have a cookie <:cookie:1256191485406216316>']
  },
  {
    trigger: 'nunya',
    responses: ['NUNYA BUSINESS, GET REKT N00B']
  },
  {
    trigger: 'oi',
    responses: ['what is this mess?!']
  },
  {
    trigger: 'oof',
    responses: ['<@789560050137825310> Ayo OOF\'d Zipper who\'s NERVOUS!\nShut up <@582103713909309440>']
  },
  {
    trigger: 'ooof',
    responses: ['<@789560050137825310> imagine losing 36 million bot money in 30 seconds']
  },
  {
    trigger: 'oooof',
    responses: ['✅ `Case #16`: <@789560050137825310> has been OOF\'ed for eternity.']
  },
  {
    trigger: 'padre',
    responses: ['*El\' Padre sends his greetings.. Not!*']
  },
  {
    trigger: 'planet',
    responses: ['Want me to fight em?']
  },
  {
    trigger: 'penguin',
    responses: ['https://discord.com/channels/@me/933340891932938281/1396488802284998849']
  },
  {
    trigger: 'rai',
    responses: ['gud bai don crai i vil se yu in game']
  },
  {
    trigger: 'ram',
    responses: ['https://images-ext-1.discordapp.net/external/hjiKR7clRztitDI5FUC9NRDhRqQ2DvKFIhq03EXBatE/https/cdn-longterm.mee6.xyz/plugins/embeds/images/545643483243872266/08ca13132ec80fbe8ca8881cfa867dd31415eef67b9ff963aabfda43d08794a8.gif?width=247&height=139']
  },
  {
    trigger: 'riley',
    responses: ['I SPILLED TEA EVERYWHERE AGAIN!!! HELP :bangbang:']
  },
  {
    trigger: 'rsnail',
    responses: [':gun: <:mad:751679151836233770>']
  },
  {
    trigger: 'ru',
    responses: ['Hey yo what’s up? Happy to Help :heart:']
  },
  {
    trigger: 'sam',
    responses: ['*It\'s **Chilles** not Chillies* :hot_pepper: :x:']
  },
  {
    trigger: 'scorp',
    responses: ['Gotta run. Have a murder to plan. Busy day.']
  },
  {
    trigger: 'simp',
    responses: ['So how is your day going m\'Lady <:fedoratip:817326188157730848>']
  },
  {
    trigger: 'sk',
    responses: ['SKSKSKSKSKSK']
  },
  {
    trigger: 'sky',
    responses: ['what would YOU do?']
  },
  {
    trigger: 'slap',
    responses: ['<:slappp:930249963059937303> <:slappp:930249963059937303> <:slappp:930249963059937303> <:slappp:930249963059937303> <:slappp:930249963059937303> <:slappp:930249963059937303>']
  },
  {
    trigger: 'smh',
    responses: ['I\'M TRYING! let me think']
  },
  {
    trigger: 'snow',
    responses: ['snowball at your head']
  },
  {
    trigger: 'sonic',
    responses: ['WHERE IS EVAN?']
  },
  {
    trigger: 'sorry',
    responses: ['shit shorty it was an accident']
  },
  {
    trigger: 'spotty',
    responses: ['Just a woman who loves cows, oop. :cow:']
  },
  {
    trigger: 'stm',
    responses: ['NUTELLA :tongue: FOR YOU!']
  },
  {
    trigger: 'stv',
    responses: ['Steven!! <:awe:726904213854224384>']
  },
  {
    trigger: 'swager',
    responses: ['...']
  },
  {
    trigger: 'taylorswift',
    responses: ['sorry, the old <@926077773091594251> can\'t come to the phone right now']
  },
  {
    trigger: 'thunder',
    responses: ['<@789560050137825310> is obsessed with beans dog']
  },
  {
    trigger: 'toilet-fact',
    responses: ['The average person visits the toilet 2500 times a year, about 6-8 times a day. We spend about 3 years of our lives on the toilet.']
  },
  {
    trigger: 'toxics',
    responses: ['<:catscream:1016823523987181620>']
  },
  {
    trigger: 'trash',
    responses: ['Know your place, Trash!']
  },
  {
    trigger: 'twins',
    responses: ['Gimme some <@&828805860708712479> !!!']
  },
  {
    trigger: 'uwu',
    responses: ['I LOVE YOU']
  },
  {
    trigger: 'val',
    responses: ['**Val**our, Valiance, Victory!']
  },
  {
    trigger: 'vibecheck',
    responses: ['✅ Vibes immaculate.']
  },
  {
    trigger: 'volcano',
    responses: ['Don\'t bully me!\n\n- Thank you!! <a:hfblueheart:795961906024284210>']
  },
  {
    trigger: 'waffles',
    responses: ['<@713753055241175060> MOLDY WAFFLES, STINKY DOG! CMERE <:mad:751679151836233770>']
  },
  {
    trigger: 'walver',
    responses: ['<@USER_ID> Best gambler in Las Vegas <:verycool:831918905873662062>']
  },
  {
    trigger: 'wiggly',
    responses: ['Sleep is for the weak.']
  },
  {
    trigger: 'winter',
    responses: ['I\'m not very good just very very lucky']
  },
  {
    trigger: 'wynn',
    responses: ['We are The Wynners! <:huehue:653369999976693770>']
  },
  {
    trigger: 'zamb',
    responses: ['Hey! I\'ve been looking all over for you! What\'s wrong? No don\'t say nothing, because I know you, and I can see something is bothering you. Cmon you know that smile isn\'t going to fool me right? I\'ve known you for way too long to be fooled by that. And why can\'t you look me in the eyes all of a sudden? Did I do something wrong? Is that why I haven\'t heard from you in like a week? Oh, it\'s not me. Thank god. But… what is it then? Did you have a fight with your girlfriend? Shouldn\'t she be here with you? Oh… you broke up? What happened? And why didn\'t you tell me? You know I would have been there for you. Well… I\'m here now, so let\'s talk about it. What do you mean, no? You\'re my best friend and I love you too much to let you sit here alone with your own thoughts. And you know I won\'t stop bugging you until you talk to me. Well, of course I love you! You\'re… my best friend! What kind of question is that anyways? Now c\'mon, talk to me. Somewhere private? Of course! Let\'s go to the terrace. On the terrace. So… tell me. What happened? Still don\'t want to talk about it, huh? Well then I\'ll talk if you don\'t mind. I never thought she was right for you.']
  }
];

async function migrate() {
  await mongoose.connect(database);
  console.log('Connected to DB');

  let inserted = 0, skipped = 0;

  for (const cmd of commands) {
    try {
      await gotwModel.create(cmd);
      console.log(`✅ Inserted: !${cmd.trigger}`);
      inserted++;
    } catch (err) {
      if (err.code === 11000) {
        console.warn(`⚠️  Skipped (already exists): !${cmd.trigger}`);
        skipped++;
      } else {
        console.error(`❌ Error on !${cmd.trigger}:`, err.message);
      }
    }
  }

  console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

migrate();