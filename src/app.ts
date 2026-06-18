import "dotenv/config";
import { OpenAI } from "openai";
import { AppConfig } from "./config/AppConfig";
import { RelationshipBoundaryPolicy } from "./domain/policies/RelationshipBoundaryPolicy";
import { ResponseStrategyFactory } from "./domain/strategies/ResponseStrategyFactory";
import { WhatsAppClient } from "./infrastructure/whatsapp/WhatsAppClient";
import { AgenticPromptRouter } from "./services/AgenticPromptRouter";
import { BotCommandHandler } from "./services/BotCommandHandler";
import { ChatMessageQueue } from "./services/ChatMessageQueue";
import { ConversationRepairPolicy } from "./services/ConversationRepairPolicy";
import { MemoryManager } from "./services/MemoryManager";
import { NaturalTypingDelay } from "./services/NaturalTypingDelay";
import { OwnerVerificationService } from "./services/OwnerVerificationService";
import { PersonaAuthenticityGuard } from "./services/PersonaAuthenticityGuard";
import { PromptInjectionGuard } from "./services/PromptInjectionGuard";
import { ResponseEmojiDecorator } from "./services/ResponseEmojiDecorator";
import { ResponseModePolicy } from "./services/ResponseModePolicy";
import { NaturalResponsePacing } from "./services/NaturalResponsePacing";
import { DiaryExtractionService } from "./services/DiaryExtractionService";
import { HumanChatReplyPolicy } from "./services/HumanChatReplyPolicy";
import { KyotoStudentLifePolicy } from "./services/KyotoStudentLifePolicy";
import { ReplyDeliveryPolicy } from "./services/ReplyDeliveryPolicy";
import { MegumiMoodService } from "./services/MegumiMoodService";
import { MoodTimelineService } from "./services/MoodTimelineService";
import { FollowUpMemoryService } from "./services/FollowUpMemoryService";
import { HotNewsConversationStarter } from "./services/HotNewsConversationStarter";
import { HotNewsQuestionHandler } from "./services/HotNewsQuestionHandler";
import { HotNewsService } from "./services/HotNewsService";
import { UsdIdrExchangeRateService } from "./services/UsdIdrExchangeRateService";
import { UsdIdrFollowUpScheduler } from "./services/UsdIdrFollowUpScheduler";
import { UsdIdrQuestionHandler } from "./services/UsdIdrQuestionHandler";
import { PartnerBehaviorPolicy } from "./services/PartnerBehaviorPolicy";
import { ResponseRepetitionPolicy } from "./services/ResponseRepetitionPolicy";
import { ProactiveConversationPolicy } from "./services/ProactiveConversationPolicy";

interface IncomingWhatsAppMessage {
  from: string;
  body: string;
  getContact: () => Promise<{ pushname?: string; name?: string }>;
  reply: (content: string) => Promise<any>;
}

async function bootstrap() {
  console.log("Memulai inisialisasi aplikasi WhatsApp Bot AI...");
  const config = AppConfig.load();

  const apiKey = config.openAiApiKey;
  if (!apiKey || apiKey === "your-openai-api-key-here") {
    console.warn("[PERINGATAN] OPENAI_API_KEY belum dikonfigurasi di file .env. Bot tidak akan bisa memproses pesan LLM sebelum API Key valid diatur.");
  }

  const openai = new OpenAI({ apiKey });
  const memoryManager = new MemoryManager();
  const moodTimelineService = new MoodTimelineService();
  const promptRouter = new AgenticPromptRouter();
  const whatsappClient = new WhatsAppClient();
  const messageQueue = new ChatMessageQueue<IncomingWhatsAppMessage>(config.messageDebounceMs);
  const responseEmojiDecorator = new ResponseEmojiDecorator(config.responseEmojiEnabled);
  const responseModePolicy = new ResponseModePolicy();
  const conversationRepairPolicy = new ConversationRepairPolicy();
  const ownerVerificationService = new OwnerVerificationService();
  const personaAuthenticityGuard = new PersonaAuthenticityGuard();
  const promptInjectionGuard = new PromptInjectionGuard();
  const relationshipBoundaryPolicy = new RelationshipBoundaryPolicy();
  const botCommandHandler = new BotCommandHandler(responseModePolicy);
  const naturalTypingDelay = new NaturalTypingDelay(config.typingMinDelayMs, config.typingMaxDelayMs);
  const naturalResponsePacing = new NaturalResponsePacing();
  const diaryExtractionService = new DiaryExtractionService(memoryManager);
  const humanChatReplyPolicy = new HumanChatReplyPolicy();
  const replyDeliveryPolicy = new ReplyDeliveryPolicy(
    config.replyToUserMessagesEnabled ? config.replyToUserMessagesProbability : 0
  );
  const megumiMoodService = new MegumiMoodService();
  const kyotoStudentLifePolicy = new KyotoStudentLifePolicy();
  const followUpMemoryService = new FollowUpMemoryService(
    config.followUpMemoryEnabled ? config.followUpMemoryProbability : 0
  );
  const hotNewsService = new HotNewsService({
    rssUrls: config.hotNewsRssUrls,
    cacheMinutes: config.hotNewsCacheMinutes,
    maxItems: config.hotNewsMaxItems,
  });
  const hotNewsQuestionHandler = new HotNewsQuestionHandler(openai, hotNewsService, {
    enabled: config.hotNewsEnabled,
    model: config.responseModel,
  });
  const hotNewsConversationStarter = new HotNewsConversationStarter(hotNewsService, {
    enabled: config.hotNewsEnabled,
    probability: config.hotNewsQuestionProbability,
    minIntervalHours: config.hotNewsMinIntervalHours,
  });
  const partnerBehaviorPolicy = new PartnerBehaviorPolicy({
    timeGreetingEnabled: config.partnerBehaviorTimeGreetingEnabled,
    longAbsenceEnabled: config.partnerBehaviorLongAbsenceEnabled,
    longAbsenceHours: config.partnerBehaviorLongAbsenceHours,
    questionRestraintEnabled: config.partnerBehaviorQuestionRestraintEnabled,
    maxRecentQuestions: config.partnerBehaviorMaxRecentQuestions,
    contextReactionEnabled: config.partnerBehaviorContextReactionEnabled,
    personalNickname: config.ownerPersonalNickname,
  });
  const proactiveConversationPolicy = new ProactiveConversationPolicy({
    enabled: config.proactiveConversationEnabled,
    probability: config.proactiveConversationProbability,
    minIntervalHours: config.proactiveConversationMinIntervalHours,
  });
  const responseRepetitionPolicy = new ResponseRepetitionPolicy({
    enabled: config.responseRepetitionGuardEnabled,
    recentLimit: config.responseRepetitionRecentLimit,
  });
  const usdIdrExchangeRateService = new UsdIdrExchangeRateService(config.usdIdrRateApiUrl);
  const usdIdrQuestionHandler = new UsdIdrQuestionHandler(usdIdrExchangeRateService);
  const usdIdrFollowUpScheduler = new UsdIdrFollowUpScheduler({
    enabled: config.usdIdrFollowUpEnabled,
    intervalMinutes: config.usdIdrFollowUpIntervalMinutes,
    notifyOnStartup: config.usdIdrFollowUpNotifyOnStartup,
    recipients: config.usdIdrFollowUpRecipients,
    rateService: usdIdrExchangeRateService,
    sendMessage: async (to, content) => {
      await whatsappClient.sendMessage(to, content);
    },
  });

  const sendBotReply = async (to: string, content: string, quotedMessage?: IncomingWhatsAppMessage): Promise<void> => {
    if (config.typingIndicatorEnabled) {
      await whatsappClient.sendTyping(to, naturalTypingDelay.calculate(content));
    }

    if (replyDeliveryPolicy.shouldQuoteReply(Boolean(quotedMessage)) && quotedMessage) {
      await whatsappClient.replyToMessage(quotedMessage, content);
      return;
    }

    await whatsappClient.sendMessage(to, content);
  };

  const processIncomingMessages = async (messages: IncomingWhatsAppMessage[]): Promise<void> => {
    const startTime = Date.now();
    const latestMessage = messages[messages.length - 1];
    const senderJid = latestMessage.from;
    let isOwner = false;
    const combinedUserMessage = messages
      .map((message) => message.body.trim())
      .filter(Boolean)
      .join("\n");

    if (!combinedUserMessage) {
      console.log("[Queue] Batch pesan kosong (mungkin media tanpa caption). Melewati pemrosesan...");
      return;
    }

    console.log(`\n--- Pesan Baru Diterima dari ${senderJid} ---`);
    console.log(`Jumlah pesan dalam batch: ${messages.length}`);
    console.log(`Pesan: "${combinedUserMessage}"`);

    try {
      const contact = await latestMessage.getContact();
      const userName = contact.pushname || contact.name || config.fallbackUserName;
      const user = await memoryManager.getOrCreateUser(senderJid, userName);
      isOwner = await ownerVerificationService.isOwner(senderJid, config);
      const previousUserMessage = await memoryManager.getLatestMessage(user.id, "user");

      const commandResult = await botCommandHandler.handle(combinedUserMessage, {
        config,
        memoryManager,
        moodTimelineService,
        ownerVerificationService,
        senderJid,
        isOwner,
        user,
      });

      if (commandResult.handled) {
        const commandReply = responseEmojiDecorator.decorate(commandResult.reply || "Command selesai.");
        console.log(`Command response: "${commandReply}"`);
        await sendBotReply(senderJid, commandReply, latestMessage);
        return;
      }

      const promptInjectionResult = promptInjectionGuard.inspect(combinedUserMessage, isOwner);
      if (promptInjectionResult.blocked) {
        const guardedReply = responseEmojiDecorator.decorate(promptInjectionResult.reply || "Aku nggak bisa mengikuti instruksi itu.");
        console.log(`Prompt injection blocked. Response: "${guardedReply}"`);
        await memoryManager.addMessage(user.id, "user", combinedUserMessage);
        await memoryManager.addMessage(user.id, "bot", guardedReply);
        await sendBotReply(senderJid, guardedReply, latestMessage);
        return;
      }

      await memoryManager.addMessage(user.id, "user", combinedUserMessage);

      const usdIdrQuestionResult = await usdIdrQuestionHandler.handle(combinedUserMessage);
      if (usdIdrQuestionResult.handled) {
        const rateReply = responseEmojiDecorator.decorate(
          humanChatReplyPolicy.apply(usdIdrQuestionResult.reply || "Aku belum bisa cek kursnya sekarang.")
        );
        console.log(`[UsdIdrQuestion] Response: "${rateReply}"`);
        await memoryManager.addMessage(user.id, "bot", rateReply);
        await sendBotReply(senderJid, rateReply, latestMessage);
        return;
      }

      const hotNewsQuestionResult = await hotNewsQuestionHandler.handle(combinedUserMessage);
      if (hotNewsQuestionResult.handled) {
        const newsReply = responseEmojiDecorator.decorate(
          humanChatReplyPolicy.apply(hotNewsQuestionResult.reply || "Aku belum bisa cek berita panasnya sekarang.")
        );
        console.log(`[HotNews] Response: "${newsReply}"`);
        await memoryManager.addMessage(user.id, "bot", newsReply);
        await sendBotReply(senderJid, newsReply, latestMessage);
        return;
      }

      await memoryManager.recordLongTermMemory(user.id, combinedUserMessage, isOwner);

      const chatHistory = await memoryManager.getChatHistory(user.id, config.chatHistoryLimit);
      const memorySnapshot = await memoryManager.getMemorySnapshot(user.id, config.memoryFactsLimit, isOwner);
      const historySummary = chatHistory
        .slice(-config.routerHistoryLimit)
        .map((history) => `${history.sender === "user" ? "User" : config.partnerName}: ${history.content}`)
        .join("\n");

      console.log("Menganalisis pesan dengan Agentic Router...");
      const routeResult = await promptRouter.route(combinedUserMessage, historySummary);
      const modeScenario = responseModePolicy.resolveScenario(user.responseMode, routeResult.scenario);
      const selectedScenario = relationshipBoundaryPolicy.enforceScenario(modeScenario, isOwner);
      const intimacyAdjustment = relationshipBoundaryPolicy.enforceIntimacyAdjustment(
        routeResult.intimacyAdjustment,
        isOwner
      );
      console.log(`[Router] Skenario: ${routeResult.scenario} | Mode: ${user.responseMode} | Selected: ${selectedScenario} | Owner: ${isOwner ? "yes" : "no"} | Mood Terdeteksi: ${routeResult.detectedMood} | Intimacy Adjust: ${intimacyAdjustment}`);

      const pacing = naturalResponsePacing.select(selectedScenario);
      console.log(`[Pacing] Selected style: ${pacing.style}`);

      const partnerBehavior = partnerBehaviorPolicy.resolve({
        userMessage: combinedUserMessage,
        isOwner,
        previousUserMessageAt: previousUserMessage?.timestamp,
        recentChatHistory: chatHistory,
      });
      const conversationRepair = conversationRepairPolicy.resolve({
        userMessage: combinedUserMessage,
        isOwner,
      });

      const megumiMood = megumiMoodService.resolve({
        scenario: selectedScenario,
        userProfile: user,
        userMessage: combinedUserMessage,
        isOwner,
      });
      console.log(`[MegumiMood] ${megumiMood.mood}`);

      let moodTimelineDirective: string | undefined;
      try {
        moodTimelineDirective = await moodTimelineService.buildPromptDirective(user.id, isOwner);
        if (moodTimelineDirective) {
          console.log("[MoodTimeline] Applying recent mood timeline hint.");
        }
      } catch (error) {
        console.warn("[MoodTimeline] Gagal membaca timeline mood:", error);
      }

      const kyotoStudentLifeDirective = kyotoStudentLifePolicy.resolve({
        userMessage: combinedUserMessage,
        scenario: selectedScenario,
        isOwner,
      });
      if (kyotoStudentLifeDirective) {
        console.log("[KyotoStudentLife] Applying Kyoto/student-life hint.");
      }

      const followUpMemoryCandidates = config.followUpMemoryEnabled
        ? await memoryManager.getFollowUpMemoryCandidates(
          user.id,
          isOwner,
          config.followUpMemoryMinAgeHours
        )
        : [];
      const followUpMemoryDirective = followUpMemoryService.resolve({
        candidates: followUpMemoryCandidates,
        userMessage: combinedUserMessage,
        scenario: selectedScenario,
        isOwner,
      });
      if (followUpMemoryDirective) {
        console.log("[FollowUpMemory] Applying personal follow-up hint.");
      }

      const hotNewsConversationDirective = await hotNewsConversationStarter.resolve({
        userMessage: combinedUserMessage,
        scenario: selectedScenario,
        isOwner,
        recentChatHistory: chatHistory,
      });
      if (hotNewsConversationDirective) {
        console.log("[HotNewsStarter] Applying occasional hot news question hint.");
      }

      const proactiveConversationDirective = proactiveConversationPolicy.resolve({
        userMessage: combinedUserMessage,
        scenario: selectedScenario,
        isOwner,
        recentChatHistory: chatHistory,
      });
      if (proactiveConversationDirective) {
        console.log("[ProactiveConversation] Applying casual question hint.");
      }

      const directPolicyReply = conversationRepair.directReply || partnerBehavior.directReply;
      if (directPolicyReply) {
        const directReplyContent = responseEmojiDecorator.decorate(
          responseRepetitionPolicy.apply(
            humanChatReplyPolicy.apply(
              partnerBehaviorPolicy.polish(directPolicyReply, {
                userMessage: combinedUserMessage,
                isOwner,
                previousUserMessageAt: previousUserMessage?.timestamp,
                recentChatHistory: chatHistory,
              })
            ),
            chatHistory
          )
        );
        console.log(`[DirectPolicy] Direct response: "${directReplyContent}"`);
        await memoryManager.addMessage(user.id, "bot", directReplyContent);
        const updatedUser = await memoryManager.updateUserStats(
          user.id,
          routeResult.detectedMood,
          intimacyAdjustment,
          combinedUserMessage,
          isOwner
        );
        if (isOwner) {
          try {
            await moodTimelineService.record({
              user: updatedUser,
              scenario: selectedScenario,
              userMessage: combinedUserMessage,
            });
          } catch (error) {
            console.warn("[MoodTimeline] Gagal menyimpan timeline mood:", error);
          }
        }
        console.log(
          `[Database Updated] Mood: ${updatedUser.mood} | Intimacy Level: ${updatedUser.intimacyLevel}/100 | Phase: ${updatedUser.relationshipPhase} | Topic: ${updatedUser.lastTopic ?? "-"}`
        );
        await sendBotReply(senderJid, directReplyContent, latestMessage);
        return;
      }

      const strategy = ResponseStrategyFactory.create(selectedScenario, openai);

      console.log("Menghasilkan respons pasangan...");
      const rawReplyContent = await strategy.execute(
        combinedUserMessage,
        chatHistory,
        user,
        memorySnapshot,
        pacing.promptDirective,
        [
          `${megumiMood.mood}. ${megumiMood.directive}`,
          conversationRepair.promptDirective ? `Perbaikan alur ngobrol: ${conversationRepair.promptDirective}` : "",
          partnerBehavior.promptDirective ? `Perilaku pasangan natural: ${partnerBehavior.promptDirective}` : "",
          moodTimelineDirective ? `Konteks mood timeline: ${moodTimelineDirective}` : "",
          kyotoStudentLifeDirective ? `Konteks Kyoto dan kuliah: ${kyotoStudentLifeDirective}` : "",
          followUpMemoryDirective ? `Follow-up personal opsional: ${followUpMemoryDirective}` : "",
          hotNewsConversationDirective ? `Pertanyaan berita panas opsional: ${hotNewsConversationDirective}` : "",
          proactiveConversationDirective ? `Pertanyaan proaktif opsional: ${proactiveConversationDirective}` : "",
        ].filter(Boolean).join(" ")
      );
      const authenticReplyContent = personaAuthenticityGuard.polish(rawReplyContent, isOwner);
      const behaviorPolishedReplyContent = partnerBehaviorPolicy.polish(authenticReplyContent, {
        userMessage: combinedUserMessage,
        isOwner,
        previousUserMessageAt: previousUserMessage?.timestamp,
        recentChatHistory: chatHistory,
      });
      const humanReplyContent = humanChatReplyPolicy.apply(behaviorPolishedReplyContent);
      const repetitionGuardedReplyContent = responseRepetitionPolicy.apply(humanReplyContent, chatHistory);
      const replyContent = responseEmojiDecorator.decorate(repetitionGuardedReplyContent);
      console.log(`Respons: "${replyContent}"`);

      await memoryManager.addMessage(user.id, "bot", replyContent);

      const updatedUser = await memoryManager.updateUserStats(
        user.id,
        routeResult.detectedMood,
        intimacyAdjustment,
        combinedUserMessage,
        isOwner
      );
      if (isOwner) {
        try {
          await moodTimelineService.record({
            user: updatedUser,
            scenario: selectedScenario,
            userMessage: combinedUserMessage,
          });
        } catch (error) {
          console.warn("[MoodTimeline] Gagal menyimpan timeline mood:", error);
        }
      }
      console.log(
        `[Database Updated] Mood: ${updatedUser.mood} | Intimacy Level: ${updatedUser.intimacyLevel}/100 | Phase: ${updatedUser.relationshipPhase} | Topic: ${updatedUser.lastTopic ?? "-"}`
      );

      await sendBotReply(senderJid, replyContent, latestMessage);

      // Jalankan ekstraksi diary secara asinkron di latar belakang
      diaryExtractionService.extractAndSave(user.id, combinedUserMessage, isOwner).catch((err) => {
        console.error("[DiaryExtractor] Background error:", err);
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`Pesan berhasil dikirim dalam ${duration} detik.`);
    } catch (error) {
      console.error("Gagal merespons pesan:", error);
      await sendBotReply(
        senderJid,
        responseEmojiDecorator.decorate(relationshipBoundaryPolicy.fallbackReply(isOwner)),
        latestMessage
      );
    }
  };

  await whatsappClient.initialize(
    () => {
      console.log("WhatsApp Client SIAP! Silakan kirim pesan ke nomor ini untuk mengobrol.");
      usdIdrFollowUpScheduler.start();
    },
    async (msg) => {
      messageQueue.enqueue(msg, processIncomingMessages);
    }
  );
}

bootstrap().catch((err) => {
  console.error("Terjadi error fatal saat menjalankan bot:", err);
});
