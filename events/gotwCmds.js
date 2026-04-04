const { Events, EmbedBuilder } = require('discord.js');
const { getMemberColor } = require('../utils/getMemberColor');

const commands = {
  '1d': {
    response: 'ONE DIRECTION FTW WOOP WOOP <:catluv:830173621238235156> <:EH:545675680352960532> <:EH:545675680352960532>'
  },
  'ao': {
    response: 'Donate to Aoao in <#653287109519736832>'
  },
  'archana': {
    response: 'shut up and gib me food'
  },
  'back': {
    response: 'BACK🤺 BACK🤺 I SAY'
  },
  'banalex': {
    response: '✅ `Case #6004` <@1118496445130092584> has been banned from the server.'
  },
  'banchoco': {
    response: ':white_check_mark: `Case #9772` <@558429439684247562> has been banned for eternity.'
  },
  'bandan': {
    response: '✅ `Case #5804` <@673930439173341239> has been banned for eternity.'
  },
  'banender': {
    response: ':white_check_mark: `Case #6969` <@1028160451957243995> has been banned for eternity.'
  },
  'banfoxy': {
    response: ':white_check_mark: `Case #2167` <@537295533895581697> has been banned for eternity.'
  },
  'banjak': {
    response: '✅ `Case #2543` <@730131219848888380> has been banned for eternity.'
  },
  'banjavi': {
    response: ':white_check_mark: `Case #0545` <@754862134499999854> has been banned for eternity.'
  },
  'banjo': {
    random: [
      '✅ `Case #5804` <@640003973834866693> has been banned for eternity.',
      '🪕'
    ]
  },
  'bannight': {
    response: ':white_check_mark: `Case #6155` <@818426541624393768> has been banned for eternity.'
  },
  'banpanda': {
    response: '✅ `Case #8431` <@714512199523237938> has been banned for eternity.'
  },
  'banxtra': {
    response: '✅ Case #8811 <@616734300875915311> has been banned for eternity.'
  },
  'banyoda': {
    response: ':white_check_mark: `Case #8620` <@451724404141850645> has been banned for eternity.'
  },
  'barney': {
    response: '<@561251425359757314> https://cdn.discordapp.com/attachments/751843909575114883/1192642161741676645/giphy.gif'
  },
  'beans': {
    response: '<@768562638837776444> GO TO SLEEP YOU FILTHY ANIMAL <:mad:751679151836233770>'
  },
  'boy': {
    random: [
      'Boy, I sure love Help Force',
      'Elp, you\'re not a boy anymore.',
      '<:boyisurelovehf:1193600010508587138>'
    ]
  },
  'cattt': {
    response: 'This is a Cat-astrophe!'
  },
  'chandler': {
    response: 'I’d agree with you, but then we’d both be wrong.'
  },
  'chlo': {
    response: 'Did someone say chaos? <:hell:704771826902892574>'
  },
  'coconut': {
    response: 'https://cdn.discordapp.com/attachments/1256130653443981322/1256176974871924798/image.png'
  },
  'cricket-noises': {
    response: '*chirp* *chirp* *chirp*'
  },
  'crispy': {
    response: 'CHICKN IS FRIEND NOT FOOD!!!'
  },
  'diwix': {
    response: "IT'S NOT ME, IT'S MY INTERNET <:cutesob:756885988105781288>"
  },
  'elp': {
    response: 'OH NO! :scream_cat:\n\n*Anyway...* :smile_cat:'
  },
  'evans': {
    response: 'I dont wike it'
  },
  'flop': {
    response: 'https://tenor.com/view/rims-rolling-wheel-silly-idiot-gif-7842420'
  },
  'fluff': {
    random: [
      "https://media.discordapp.net/attachments/1127004346605908058/1127693604853395537/canva-free-cute-funny-cat-mug-cup-EFT7PfWWv2c.png?width=588&height=580",
      "https://media.discordapp.net/attachments/1127004346605908058/1127693490093035591/2022-cute-cat-moments.png?width=848&height=580",
      "https://media.discordapp.net/attachments/1127004346605908058/1127693571353481268/best-girl-cat-names-1606245046.png?width=868&height=580",
      "https://media.discordapp.net/attachments/1127004346605908058/1127693722277138582/8835992-cute-cat-smile.png?width=927&height=580",
      "https://media.discordapp.net/attachments/1127004346605908058/1127693915122839562/sSaZSlIgofq_large.png?width=450&height=450",
      "https://cdn.discordapp.com/attachments/1127004346605908058/1127694897483358208/high.png",
      "https://cdn.discordapp.com/attachments/1127004346605908058/1127694932463865876/hd-cute-cat-wallpaper.png",
      "https://media.discordapp.net/attachments/1127004346605908058/1127697060045537370/image.png?width=387&height=580",
      "https://media.discordapp.net/attachments/1127004346605908058/1127697136553824338/338745-1600x1066-kitten-1442857261.png?width=870&height=580",
      "https://media.discordapp.net/attachments/1127004346605908058/1127697576515354735/image.png?width=386&height=580",
      "https://media.discordapp.net/attachments/1127004346605908058/1127697682215997670/image.png?width=577&height=580",
      "https://media.discordapp.net/attachments/1127004346605908058/1127697770489331712/cute-photos-of-cats-in-suitcase-1593184776.png?width=1031&height=580",
      "https://media.discordapp.net/attachments/1127004346605908058/1127697839368187966/kitten-flowers-wallpaper-preview.png?width=910&height=512",
      "https://media.discordapp.net/attachments/1127004346605908058/1127697962613620866/cute20kitten20lying20on20radiator.png?width=1110&height=580",
      "https://media.discordapp.net/attachments/1127004346605908058/1127698003487105175/photo-1591871937573-74dbba515c4c.png?width=870&height=580",
      "https://media.discordapp.net/attachments/1127004346605908058/1127698052405276762/cutest_kitten-Cute_pet_cat_desktop_pictures_1920x1200.png?width=927&height=580",
      "https://media.discordapp.net/attachments/1127004346605908058/1127698212451520573/Cute-Kitten-Wallpaper-Free-Download.png?width=1031&height=580",
      "https://media.discordapp.net/attachments/1127004346605908058/1127698258731487302/wicker-basket-kitten-basket-cats-wallpaper-preview.png?width=910&height=512",
      "https://media.discordapp.net/attachments/1127004346605908058/1127698357909983233/Shaelynn-Wade.png?width=870&height=580",
      "https://media.discordapp.net/attachments/1127004346605908058/1127698465472913508/image.png?width=326&height=580"
    ]
  },
  'fox': {
    response: "https://images-ext-1.discordapp.net/external/V0K1KiF0mXVtNWAjyziIqraDwSOEpkXIeqDWVqraTxw/https/cdn-longterm.mee6.xyz/plugins/embeds/images/545643483243872266/5a4a5d4d9994a3fe7bc10c1293bfcc7aa9d4bd0a4b28da2344ee8041b96bd302.gif?width=562&height=297"
  },
  'frog': {
    response: '<@640139297718272000> WAKE UP AND BOUNCE FROG!'
  },
  'frostqueenhf': {
    response: 'The Ice Queen is ready to protect Help Force from any danger!'
  },
  'fume': {
    response: 'https://tenor.com/view/bruh-bruh-triggered-bruh-bttv-meme-gif-16887494'
  },
  'gn': {
    response: 'Go to bed, sleepy head!!'
  },
  'hampterparty': {
    response: 'hampter hampter hampter hampter hampter hampter hampter hampter hampter hampter'
  },
  'hannah': {
    response: 'ABSOLUTE DISCRIMINATION'
  },
  'harry': {
    response: 'You can’t say fairer than fair enough'
  },
  'hbd': {
    response: 'Happy Birthday Help Force! <:EK:545677199915614210> :confetti_ball:'
  },
  'hfbf': {
    response: 'HELP FORCE BEST FORCE <:HF:714824354122432534>'
  },
  'kofi': {
    response: `is in her seventh identity crisis of the week`
  },
  'mehh': {
    response: `MEHH but I'm too lazyyyy <:flop:714824333905625098>`
  },
  'honk': {
    response: 'yehs thats grape <:alerthonk:869278988713988097>'
  },
  'hster': {
    response: `i feel like im watching a soap opera but i started halfway through the season so theres no context and nothing makes sense but i love it anyways`
  },
  'hype': {
    response: 'https://cdn.discordapp.com/attachments/653298038961340466/1012168129260027944/warbanner2.png'
  },
  'ily': {
    response: 'i love you so fucking mcdonalds'
  },
  'ineedhelp': {
    response: 'Help will always be given in The Help Force, if you ask for it or need it!'
  },
  'jc': {
    response: 'To Bullies: \n 🖐️ Hold your hand out and say STOP IT 🖐️'
  },
  'jts': {
    response: 'My name is justnita'
  },
  'kermit': {
    response: 'https://tenor.com/view/kermit-kermit-the-frog-tea-tea-day-sipping-tea-gif-15288264'
  },
  'meh': {
    response: '<:E6:545676405447327744>'
  },
  'mines': {
    response: 'Right this way <a:mining:913237811094749224>\nhttps://media.discordapp.net/attachments/957602982411763712/1057387488177561730/toTheMines.gif'
  },
  'mines1': {
    response: 'https://cdn.discordapp.com/attachments/796421495240654871/1132129897465262110/2f35d4c4-88ef-4169-859f-95a684d1005c.png'
  },
  'mintea': {
    response: 'Minty mint tea'
  },
  'motivate': {
    random: [
      'Never forget that you are the best!',
      'Stay positive and good things will happen!',
      'All we have is now. Live in the moment!',
      'Whatever you decide to do, make sure it makes you happy!'
    ]
  },
  'nafis': {
    response: 'You go to gulag <:sovietmaniac:653370110039293973>'
  },
  'start-nap': {
    response: '<@&911379868619505674> Log on for the Nap Segment! Follow the Host!'
  },
  'niko': {
    response: 'Here, have a cookie <:cookie:1256191485406216316>'
  },
  'nunya': {
    response: 'NUNYA BUSINESS, GET REKT N00B'
  },
  'oi': {
    response: 'what is this mess?!'
  },
  'oof': {
    response: '<@789560050137825310> Ayo OOF\'d Zipper who\'s NERVOUS!\nShut up <@582103713909309440>'
  },
  'ooof': {
    response: '<@789560050137825310> imagine losing 36 million bot money in 30 seconds'
  },
  'oooof': {
    response: '✅ `Case #16`: <@789560050137825310> has been OOF\'ed for eternity.'
  },
  'padre': {
    response: "*El' Padre sends his greetings.. Not!*"
  },
  'planet': {
    response: 'Want me to fight em?'
  },
  'penguin': {
    response: 'https://discord.com/channels/@me/933340891932938281/1396488802284998849'
  },
  'rai': {
    response: 'gud bai don crai i vil se yu in game'
  },
  'ram': {
    response: 'https://images-ext-1.discordapp.net/external/hjiKR7clRztitDI5FUC9NRDhRqQ2DvKFIhq03EXBatE/https/cdn-longterm.mee6.xyz/plugins/embeds/images/545643483243872266/08ca13132ec80fbe8ca8881cfa867dd31415eef67b9ff963aabfda43d08794a8.gif?width=247&height=139'
  },
  'riley': {
    response: 'I SPILLED TEA EVERYWHERE AGAIN!!! HELP :bangbang:'
  },
  'rsnail': {
    response: ':gun: <:mad:751679151836233770>'
  },
  'ru': {
    response: 'Hey yo what’s up? Happy to Help :heart:'
  },
  'sam': {
    response: "*It's **Chilles** not Chillies* :hot_pepper: :x:"
  },
  'scorp': {
    response: 'Gotta run. Have a murder to plan. Busy day.'
  },
  'simp': {
    response: "So how is your day going m'Lady <:fedoratip:817326188157730848>"
  },
  'sk': {
    response: 'SKSKSKSKSKSK'
  },
  'sky': {
    response: 'what would YOU do?'
  },
  'slap': {
    response: '<:slappp:930249963059937303> <:slappp:930249963059937303> <:slappp:930249963059937303> <:slappp:930249963059937303> <:slappp:930249963059937303> <:slappp:930249963059937303>'
  },
  'smh': {
    response: "I'M TRYING! let me think"
  },
  'snow': {
    response: 'snowball at your head'
  },
  'sonic': {
    response: 'WHERE IS EVAN?'
  },
  'sorry': {
    response: 'shit shorty it was an accident'
  },
  'spotty': {
    response: 'Just a woman who loves cows, oop. :cow:'
  },
  'stm': {
    response: 'NUTELLA :tongue: FOR YOU!'
  },
  'stv': {
    response: 'Steven!! <:awe:726904213854224384>'
  },
  'swager': {
    response: '...'
  },
  'taylorswift': {
    response: `sorry, the old <@926077773091594251> can't come to the phone right now`
  },
  'thunder': {
    response: '<@789560050137825310> is obsessed with beans dog'
  },
  'toilet-fact': {
    response: 'The average person visits the toilet 2500 times a year, about 6-8 times a day. We spend about 3 years of our lives on the toilet.'
  },
  'ToxicS': {
    response: '<:catscream:1016823523987181620>'
  },
  'trash': {
    response: 'Know your place, Trash!'
  },
  'twins': {
    response: 'Gimme some <@&828805860708712479> !!!'
  },
  'uwu': {
    response: 'I LOVE YOU'
  },
  'val': {
    response: '**Val**our, Valiance, Victory!'
  },
  'vibecheck': {
    response: '✅ Vibes immaculate.'
  },
  'volcano': {
    response: "Don't bully me!\n\n- Thank you!! <a:hfblueheart:795961906024284210>"
  },
  'waffles': {
    response: '<@713753055241175060> MOLDY WAFFLES, STINKY DOG! CMERE <:mad:751679151836233770>'
  },
  'walver': {
    response: '<@USER_ID> Best gambler in Las Vegas <:verycool:831918905873662062>'
  },
  'wiggly': {
    response: 'Sleep is for the weak.'
  },
  'winter': {
    response: "I'm not very good just very very lucky"
  },
  'wynn': {
    response: 'We are The Wynners! <:huehue:653369999976693770>'
  },
  'zamb': {
    response: `Hey! I've been looking all over for you! What's wrong? No don't say nothing, because I know you, and I can see something is bothering you. Cmon you know that smile isn't going to fool me right? I've known you for way too long to be fooled by that. And why can't you look me in the eyes all of a sudden? Did I do something wrong? Is that why I haven't heard from you in like a week? Oh, it's not me. Thank god. But… what is it then? Did you have a fight with your girlfriend? Shouldn't she be here with you? Oh… you broke up? What happened? And why didn't you tell me? You know I would have been there for you. Well… I'm here now, so let's talk about it. What do you mean, no? You're my best friend and I love you too much to let you sit here alone with your own thoughts. And you know I won't stop bugging you until you talk to me. Well, of course I love you! You're… my best friend! What kind of question is that anyways? Now c'mon, talk to me. Somewhere private? Of course! Let's go to the terrace. On the terrace. So… tell me. What happened? Still don't want to talk about it, huh? Well then I'll talk if you don't mind. I never thought she was right for you.`
  }
};

function makeEmbed(member, response) {
  const embed = new EmbedBuilder()
    .setColor(getMemberColor(member) || '#5865F2');

  const urlMatch = response.match(/(https?:\/\/\S+\.(?:gif|png|jpe?g|webp)(?:\?\S*)?)/i);
  if (urlMatch) {
    const [url] = urlMatch;
    const text = response.replace(url, '').trim();
    if (text) embed.setDescription(text);
    embed.setImage(url);
  } else {
    embed.setDescription(response);
  }
  return embed;
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot) return;
    const content = message.content.trim();
    if (!content.startsWith('!')) return;

    // permission check
    if (!message.member.roles.cache.has('653262058514808842')) return;

    const option = content.slice(1).toLowerCase();
    const cmd = commands[option];
    if (!cmd) return;

    // pick either static or random
    const response = Array.isArray(cmd.random)
      ? cmd.random[Math.floor(Math.random() * cmd.random.length)]
      : cmd.response;

    // check for an image URL
    const urlMatch = response.match(/(https?:\/\/\S+\.(?:gif|png|jpe?g|webp))/i);
    if (urlMatch) {
      // only build an embed if we have an image
      const embed = makeEmbed(message.member, response);
      await message.channel.send({ embeds: [embed] });
    } else {
      // plain-text—send raw
      await message.channel.send(response);
    }
  }
};
