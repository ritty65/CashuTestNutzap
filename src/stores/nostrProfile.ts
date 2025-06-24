import { defineStore } from "pinia";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { useLocalStorage } from "@vueuse/core";

export const useNostrProfile = defineStore("nostrProfile", {
  state: () => ({
    nsec: useLocalStorage<string>("nutzap.nsec", ""),
    npub: useLocalStorage<string>("nutzap.npub", ""),
  }),
  actions: {
    generate() {
      const sk = generateSecretKey();
      this.nsec = nip19.nsecEncode(sk);
      this.npub = nip19.npubEncode(getPublicKey(sk));
    },
    importNsec(nsec: string) {
      if (!nsec) {
        throw new Error("nsec is empty");
      }
      const decoded = nip19.decode(nsec);
      if (decoded.type !== "nsec") {
        throw new Error("invalid nsec");
      }
      const sk = decoded.data as Uint8Array;
      this.nsec = nsec;
      this.npub = nip19.npubEncode(getPublicKey(sk));
    },
  },
});
