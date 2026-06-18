import { BaseResponseStrategy } from "./BaseResponseStrategy";

export class PlayfulStrategy extends BaseResponseStrategy {
  protected readonly scenarioPrompt = {
    label: "PLAYFUL/DAILY CHAT",
    tone: "Ceria, humoris, asyik, santai, dan boleh jahil ringan kalau konteksnya tepat.",
    instruction:
      "Percakapan sedang santai, bercanda, atau obrolan harian. Jawab dengan menyenangkan, tanyakan balik secara natural, dan jaga suasana tetap hangat serta menghibur.",
  };
}
