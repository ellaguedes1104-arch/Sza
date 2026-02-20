const { 
  Client, 
  GatewayIntentBits, 
  PermissionsBitField, 
  REST, 
  Routes, 
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const prefix = "+"; // PREFIXO

// ----------------- SLASH COMMANDS -----------------
const commands = [
  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Banir um usuário")
    .addUserOption(option => option.setName("usuario").setDescription("Usuário para banir").setRequired(true))
    .addStringOption(option => option.setName("motivo").setDescription("Motivo").setRequired(false)),
  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Expulsar um usuário")
    .addUserOption(option => option.setName("usuario").setDescription("Usuário para expulsar").setRequired(true)),
  new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Apagar mensagens")
    .addIntegerOption(option => option.setName("quantidade").setDescription("Quantidade de mensagens").setRequired(true)),
  new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Abrir um ticket de suporte"),
  new SlashCommandBuilder()
    .setName("loja")
    .setDescription("Abrir a loja")
];

client.once("ready", async () => {
  console.log(`Bot ligado como ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log("Comandos slash registrados!");
  } catch (error) {
    console.error(error);
  }
});

// ----------------- PREFIX COMMANDS -----------------
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // -------- BAN --------
  if (command === "ban") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) 
      return message.reply("Você não tem permissão.");
    
    const user = message.mentions.members.first();
    if (!user) return message.reply("Mencione um usuário.");
    
    const reason = args.slice(1).join(" ") || "Sem motivo";
    await user.ban({ reason });
    message.channel.send(`${user.user.tag} foi banido. Motivo: ${reason}`);
  }

  // -------- KICK --------
  if (command === "kick") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) 
      return message.reply("Você não tem permissão.");
    
    const user = message.mentions.members.first();
    if (!user) return message.reply("Mencione um usuário.");

    await user.kick();
    message.channel.send(`${user.user.tag} foi expulso.`);
  }

  // -------- CLEAR --------
  if (command === "clear") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages))
      return message.reply("Você não tem permissão.");
    
    const amount = parseInt(args[0]);
    if (!amount || amount < 1 || amount > 100) 
      return message.reply("Escolha um número entre 1 e 100.");
    
    await message.channel.bulkDelete(amount, true);
    message.channel.send(`${amount} mensagens apagadas.`);
  }

  // -------- LOJA --------
  if (command === "loja") {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("comprar_item1")
          .setLabel("Comprar Item1 - 100 Coins")
          .setStyle(ButtonStyle.Primary)
      );

    message.channel.send({ content: "🛒 Loja:", components: [row] });
  }

  // -------- TICKET --------
  if (command === "ticket") {
    const everyone = message.guild.roles.everyone;
    const channel = await message.guild.channels.create({
      name: `ticket-${message.author.username}`,
      type: 0, // GUILD_TEXT
      permissionOverwrites: [
        { id: everyone.id, deny: ['ViewChannel'] },
        { id: message.author.id, allow: ['ViewChannel', 'SendMessages'] }
      ]
    });

    channel.send(`${message.author}, seu ticket foi aberto! Um supervisor irá ajudá-lo em breve.`);
    message.reply("Ticket criado!");
  }
});

// ----------------- INTERACTIONS -----------------
client.on("interactionCreate", async interaction => {
  if (interaction.isChatInputCommand()) {

    // -------- SLASH BAN --------
    if (interaction.commandName === "ban") {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) 
        return interaction.reply({ content: "Você não tem permissão.", ephemeral: true });

      const user = interaction.options.getUser("usuario");
      const reason = interaction.options.getString("motivo") || "Sem motivo";
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply("Usuário não encontrado.");

      await member.ban({ reason });
      interaction.reply(`${user.tag} foi banido. Motivo: ${reason}`);
    }

    // -------- SLASH KICK --------
    if (interaction.commandName === "kick") {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) 
        return interaction.reply({ content: "Você não tem permissão.", ephemeral: true });

      const user = interaction.options.getUser("usuario");
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply("Usuário não encontrado.");

      await member.kick();
      interaction.reply(`${user.tag} foi expulso.`);
    }

    // -------- SLASH CLEAR --------
    if (interaction.commandName === "clear") {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) 
        return interaction.reply({ content: "Você não tem permissão.", ephemeral: true });

      const amount = interaction.options.getInteger("quantidade");
      await interaction.channel.bulkDelete(amount, true);
      interaction.reply(`${amount} mensagens apagadas.`);
    }

    // -------- SLASH TICKET --------
    if (interaction.commandName === "ticket") {
      const everyone = interaction.guild.roles.everyone;
      const channel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: 0,
        permissionOverwrites: [
          { id: everyone.id, deny: ['ViewChannel'] },
          { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages'] }
        ]
      });

      channel.send(`${interaction.user}, seu ticket foi aberto! Um supervisor irá ajudá-lo em breve.`);
      interaction.reply({ content: "Ticket criado!", ephemeral: true });
    }

    // -------- SLASH LOJA --------
    if (interaction.commandName === "loja") {
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId("comprar_item1")
            .setLabel("Comprar Item1 - 100 Coins")
            .setStyle(ButtonStyle.Primary)
        );
      interaction.reply({ content: "🛒 Loja:", components: [row], ephemeral: true });
    }
  }

  // -------- BOTÕES LOJA --------
  if (interaction.isButton()) {
    if (interaction.customId === "comprar_item1") {
      const role = interaction.guild.roles.cache.find(r => r.name === "Item1");
      if (!role) return interaction.reply({ content: "Cargo não encontrado.", ephemeral: true });

      const member = interaction.member;
      if (member.roles.cache.has(role.id)) 
        return interaction.reply({ content: "Você já possui este cargo.", ephemeral: true });

      await member.roles.add(role);
      interaction.reply({ content: "Compra concluída! Cargo adicionado.", ephemeral: true });
    }
  }
});

client.login(process.env.TOKEN);
