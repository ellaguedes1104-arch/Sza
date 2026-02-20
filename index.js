const { Client, GatewayIntentBits, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// ---------------- CONFIGURAÇÕES ----------------
const CONFIG = {
  prefix: "+",
  logChannel: "logs",
  messageTempo: 10000,
  antiSpam: { limite: 5, intervalo: 5000 },
  antiRaid: { limite: 3, intervalo: 10000 },
  antiLink: true,
  cores: {
    ban: "#FF0000",
    kick: "#FF9900",
    mute: "#9900FF",
    unmute: "#00FFFF",
    clear: "#00FF00",
    ticket: "#00FF00",
    loja: "#5865F2",
    pix: "#00FFFF",
    log: "#FFA500",
    alerta: "#FFAA00",
    utilitario: "#00AAFF"
  },
  textos: {
    erro: "❌ Ocorreu um erro.",
    spamAviso: "⚠️ Pare de enviar mensagens repetidas!",
    linkBloqueado: "🚫 Links não são permitidos aqui!",
    ticketAbertura: "🎫 Seu ticket foi aberto!",
    ticketFechamento: "📌 Ticket fechado!",
    pagamentoConfirmado: "✅ Pagamento confirmado! Cargo adicionado.",
    cargoCriado: "✅ Cargo criado com sucesso!",
    cargoRemovido: "✅ Cargo removido com sucesso!",
    cargoLista: "📌 Lista de cargos:"
  },
  loja: {
    itens: [
      { nome: "Item1", preco: "R$10,00", cargo: "Item1", cor: "#5865F2", pix: "000.000.000-00" },
      { nome: "Item2", preco: "R$20,00", cargo: "Item2", cor: "#FFAA00", pix: "111.111.111-11" }
    ]
  }
};

// ---------------- LOG ----------------
async function sendLog(guild, title, description){
  try {
    const channel = guild.channels.cache.find(c=>c.name===CONFIG.logChannel);
    if(channel) channel.send({embeds:[new EmbedBuilder().setTitle(title).setDescription(description).setColor(CONFIG.cores.log).setTimestamp()]});
  } catch(e){ console.error("Erro log:", e); }
}

// ---------------- TRACKERS ----------------
const spamMap = new Map();
const raidMap = new Map();

// ---------------- READY ----------------
client.once("ready", ()=>console.log(`Bot ligado como ${client.user.tag}`));

// ---------------- MESSAGE HANDLER ----------------
client.on("messageCreate", async msg=>{
  if(msg.author.bot) return;

  try{
    // ---------- ANTI-LINK ----------
    if(CONFIG.antiLink && /https?:\/\//.test(msg.content)){
      await msg.delete().catch(()=>{});
      msg.channel.send({content:CONFIG.textos.linkBloqueado}).then(m=>setTimeout(()=>m.delete().catch(()=>{}), CONFIG.messageTempo));
    }

    // ---------- ANTI-SPAM ----------
    const now = Date.now();
    let spam = spamMap.get(msg.author.id) || {count:0,last:now};
    if(now - spam.last < CONFIG.antiSpam.intervalo){ spam.count++; } else { spam.count=1; }
    spam.last = now;
    if(spam.count >= CONFIG.antiSpam.limite){
      msg.channel.send({content:CONFIG.textos.spamAviso}).then(m=>setTimeout(()=>m.delete().catch(()=>{}), CONFIG.messageTempo));
      spam.count=0;
    }
    spamMap.set(msg.author.id, spam);

    // ---------- ANTI-RAID ----------
    let raid = raidMap.get(msg.guild.id) || [];
    raid.push(now);
    raid = raid.filter(t => now - t < CONFIG.antiRaid.intervalo);
    if(raid.length >= CONFIG.antiRaid.limite){
      msg.guild.members.cache.forEach(m=>{ if(!m.user.bot) m.kick().catch(()=>{}); });
      raidMap.set(msg.guild.id, []);
      sendLog(msg.guild,"Anti-Raid","Vários usuários foram expulsos automaticamente!");
    } else raidMap.set(msg.guild.id, raid);

    // ---------- PREFIX COMMANDS ----------
    if(!msg.content.startsWith(CONFIG.prefix)) return;
    const args = msg.content.slice(CONFIG.prefix.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // ---------- MODERAÇÃO ----------
    if(cmd==="ban"){
      if(!msg.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return msg.reply("Sem permissão");
      const user = msg.mentions.members.first(); if(!user) return msg.reply("Mencione alguém");
      const reason = args.join(" ") || "Sem motivo";
      await user.ban({reason});
      const m = await msg.channel.send({embeds:[new EmbedBuilder().setTitle("🛑 Ban").setDescription(`${user.user.tag} banido.\nMotivo: ${reason}`).setColor(CONFIG.cores.ban)]});
      sendLog(msg.guild,"Ban",`${user.user.tag} banido por ${msg.author.tag}`);
      setTimeout(()=>m.delete().catch(()=>{}), CONFIG.messageTempo);
    }

    // ---------- OUTROS COMANDOS ----------
    // kick, mute, unmute, clear, tickets, loja, cargos, etc...
    // (Seguindo mesmo padrão de try/catch, embeds e mensagens temporárias)

  } catch(e){ console.error(e); msg.reply(CONFIG.textos.erro).catch(()=>{}); }
});

// ---------------- INTERACTIONS ----------------
client.on("interactionCreate", async inter=>{
  try{
    // Loja PIX e confirmação
    if(inter.isButton()){
      // Botões: pix_Item1, confirm_Item1
      // Implementar mesma lógica de loja + embed + cargo automático
    }
  } catch(e){ console.error(e); if(inter.replied||inter.deferred) inter.followUp({content:CONFIG.textos.erro, ephemeral:true}); else inter.reply({content:CONFIG.textos.erro, ephemeral:true}); }
});

// ---------------- LOGIN ----------------
client.on("error", console.error);
client.login(process.env.TOKEN);
