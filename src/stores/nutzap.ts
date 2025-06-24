import { defineStore } from "pinia";
import { useWalletStore } from "./wallet";
import { useNostrStore } from "./nostr";
import { useMintsStore } from "./mints";
import { useP2pkStore } from "./p2pk";
import { getEncodedToken } from "../js/token";

// We need a robust library for HD (Hierarchical Deterministic) key derivation
import { HDKey } from "@scure/bip32";
import * as bip39 from "@scure/bip39";
import { schnorr } from "@noble/secp256k1";
import { bytesToHex } from "@noble/hashes/utils";

export const useNutzapStore = defineStore("nutzap", {
  state: () => ({
    p2pkSecretKey: null as Uint8Array | null,
    p2pkPublicKey: null as string | null,
    configuredMints: [] as string[],
    configuredRelays: [] as string[],
    lastPublished: null as number | null,
    isListening: false,
  }),

  actions: {
    /**
     * Derives a dedicated secp256k1 key pair for receiving P2PK Nutzaps.
     * This uses the main wallet's mnemonic to ensure the key is recoverable.
     * The derivation path is specific to NIP-61 to avoid key collisions.
     */
    async generateP2PKKeys() {
      const walletStore = useWalletStore();
      if (!walletStore.mnemonic) {
        throw new Error(
          "Mnemonic not found in wallet store. Cannot derive P2PK keys.",
        );
      }

      // 1. Get seed from mnemonic
      const seed = await bip39.mnemonicToSeed(walletStore.mnemonic);

      // 2. Create an HDKey from the seed
      const hdKey = HDKey.fromMasterSeed(seed);

      // 3. Derive the specific key for Nutzaps (NIP-61)
      // The path m/44'/1237'/61'/0/0 is a proposed standard for this purpose.
      // 1237 is 'nostr' on a telephone keypad.
      const p2pkHdKey = hdKey.derive("m/44'/1237'/61'/0/0");

      if (!p2pkHdKey.privateKey) {
        throw new Error("Could not derive private key.");
      }

      // 4. Set the state
      this.p2pkSecretKey = p2pkHdKey.privateKey;
      this.p2pkPublicKey = bytesToHex(
        schnorr.getPublicKey(p2pkHdKey.privateKey),
      );

      console.log("Nutzap P2PK keys generated successfully.");
    },

    /**
     * Constructs and publishes the kind: 10019 Nutzap Profile event to Nostr.
     */
    async publishNutzapProfile() {
      const nostrStore = useNostrStore();
      if (!nostrStore.pubkey) {
        throw new Error(
          "Nostr user not set. Please configure your Nostr key first.",
        );
      }
      if (
        !this.p2pkPublicKey ||
        this.configuredMints.length === 0 ||
        this.configuredRelays.length === 0
      ) {
        throw new Error(
          "Profile is incomplete. Please generate a P2PK key and select mints and relays.",
        );
      }

      const eventTemplate = {
        kind: 10019,
        content:
          "My Nutzap profile for receiving private Bitcoin payments via Cashu.",
        tags: [
          ["pubkey", this.p2pkPublicKey],
          ...this.configuredMints.map((mint) => ["mint", mint]),
          ...this.configuredRelays.map((relay) => ["relay", relay]),
        ],
      };

      // The signEvent and publishEvent methods are assumed to exist in nostrStore
      const signedEvent = await nostrStore.signEvent(eventTemplate);
      await nostrStore.publish(signedEvent, this.configuredRelays);
      this.lastPublished = signedEvent.created_at;
      console.log("Nutzap profile published:", signedEvent);
    },

    /**
     * Subscribes to Nostr relays to listen for incoming Nutzap payments.
     */
    startNutzapListener() {
      if (this.isListening || !this.p2pkPublicKey) return;

      const nostrStore = useNostrStore();
      if (!nostrStore.pubkey) return;

      const filters = [
        {
          kinds: [9321],
          "#p": [nostrStore.pubkey],
          "#u": this.configuredMints,
          since: Math.floor(Date.now() / 1000) - 3600, // Look back 1 hour initially
        },
      ];

      // Assuming nostrStore.subscribe takes filters and a callback
      nostrStore.subscribe(filters, this.handleNutzapEvent);
      this.isListening = true;
      console.log(
        "Started listening for incoming Nutzaps on relays:",
        this.configuredRelays,
      );
    },

    /**
     * Handles and processes an incoming kind: 9321 Nutzap event.
     * @param {object} event - The Nostr event object.
     */
    async handleNutzapEvent(event: any) {
      console.log("Received potential Nutzap event:", event);

      try {
        // Validation Step 1: Check if the mint is trusted
        const uTag = event.tags.find((t: string[]) => t[0] === "u");
        if (!uTag || !this.configuredMints.includes(uTag[1])) {
          console.warn(
            `Ignoring nutzap from untrusted mint: ${uTag ? uTag[1] : "N/A"}`,
          );
          return;
        }

        // Validation Step 2: Extract proofs
        const proofs = event.tags
          .filter((t: string[]) => t[0] === "proof")
          .map((t: string[]) => JSON.parse(t[1]));

        if (proofs.length === 0) {
          console.warn("Nutzap event contains no proofs.");
          return;
        }

        // Validation Step 3: Verify the P2PK lock matches our public key
        // The secret is a JSON string: '["P2PK",{"data":"<pubkey>","nonce":"..."}]'
        const p2pkSecretData = JSON.parse(proofs[0].secret)[1].data;
        // Per NIP-61, the pubkey MUST be prefixed with "02"
        if (p2pkSecretData !== "02" + this.p2pkPublicKey) {
          console.error("P2PK lock in Nutzap does not match our public key.");
          return;
        }

        // Redemption Step
        console.log(
          `Attempting to redeem ${proofs.reduce((a, p) => a + p.amount, 0)} sats...`,
        );
        const tokenString = getEncodedToken({ mint: uTag[1], proofs });
        const p2pkStore = useP2pkStore();

        // The redeemP2PK function is assumed to exist in the p2pkStore
        // and handle the signing and swapping logic.
        await p2pkStore.redeemP2PK(tokenString, this.p2pkSecretKey);

        // Success is handled within the redeemP2PK action (e.g., showing a notification)
        console.log("Nutzap redeemed successfully!");
      } catch (error) {
        console.error("Failed to process and redeem Nutzap:", error);
      }
    },
  },
});
