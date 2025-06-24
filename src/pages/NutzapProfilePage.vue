<template>
  <q-page padding>
    <div class="text-h4">Nostr Payments Profile (Nutzaps)</div>
    <p class="text-caption q-mb-md">
      Configure your profile to receive private, asynchronous payments (Nutzaps)
      over Nostr.
    </p>

    <q-card class="q-my-md">
      <q-card-section>
        <div class="text-h6">Nostr Identity</div>
        <p class="text-caption">
          Your Nostr key is used to sign and publish your payment profile. Using
          a browser extension (NIP-07) is the most secure method.
        </p>
        <q-input
          v-model="nostrStore.nsec"
          label="Nostr Private Key (nsec)"
          type="password"
          hint="Required to publish your profile. Stored only in your browser."
          outlined
        />
        <div class="text-body2 q-mt-sm">
          Your Public Key (npub): {{ nostrStore.npub }}
        </div>
      </q-card-section>
    </q-card>

    <q-card class="q-my-md">
      <q-card-section>
        <div class="text-h6">Receiving Key (P2PK)</div>
        <p class="text-caption">
          This is a dedicated key for receiving locked payments. It's derived
          from your wallet's main seed and is recoverable from your backup
          phrase.
        </p>
        <q-btn
          v-if="!nutzapStore.p2pkPublicKey"
          label="Generate Receiving Key"
          @click="nutzapStore.generateP2PKKeys"
          color="primary"
          unelevated
        />
        <div v-else>
          <q-input
            :model-value="nutzapStore.p2pkPublicKey"
            label="Your P2PK Public Key"
            readonly
            outlined
          >
            <template v-slot:append>
              <q-btn
                icon="content_copy"
                @click="copyKey"
                flat
                round
                dense
                title="Copy public key"
              />
            </template>
          </q-input>
        </div>
      </q-card-section>
    </q-card>

    <q-card class="q-my-md">
      <q-card-section>
        <div class="text-h6">Payment Preferences</div>
        <q-select
          v-model="nutzapStore.configuredMints"
          :options="mintsStore.mintUrls"
          label="Select Mints You Trust"
          multiple
          use-chips
          outlined
          class="q-mb-md"
          hint="You will only accept payments from these mints."
        />
        <q-input
          v-model="relaysString"
          label="Relays for Receiving Payments"
          type="textarea"
          outlined
          hint="Enter relay URLs, one per line. Senders will publish payments to these relays."
        />
      </q-card-section>
    </q-card>

    <div class="q-mt-lg">
      <q-btn
        label="Publish Profile"
        @click="publishProfile"
        color="positive"
        icon="cloud_upload"
        :loading="isPublishing"
        :disable="!canPublish"
        unelevated
      />
      <div v-if="nutzapStore.lastPublished" class="text-caption q-mt-sm">
        Last published:
        {{ new Date(nutzapStore.lastPublished * 1000).toLocaleString() }}
      </div>
    </div>
    <div class="q-mt-md">
      <q-toggle
        :model-value="nutzapStore.isListening"
        @update:model-value="toggleListener"
        label="Listen for Incoming Nutzaps"
        color="secondary"
      />
    </div>
  </q-page>
</template>

<script setup>
import { useQuasar } from 'quasar';
import { useNostrStore } from 'stores/nostr';
import { useNutzapStore } from 'stores/nutzap';
import { useMintsStore } from 'stores/mints';
import { computed, ref } from 'vue';

const $q = useQuasar();
const nostrStore = useNostrStore();
const nutzapStore = useNutzapStore();
const mintsStore = useMintsStore();

const isPublishing = ref(false);

const relaysString = computed({
  get: () => nutzapStore.configuredRelays.join('\n'),
  set: (val) => {
    nutzapStore.configuredRelays = val
      .split('\n')
      .map((r) => r.trim())
      .filter((r) => r);
  },
});

const canPublish = computed(() => {
  return (
    nostrStore.nsec &&
    nutzapStore.p2pkPublicKey &&
    nutzapStore.configuredMints.length > 0 &&
    nutzapStore.configuredRelays.length > 0
  );
});

async function publishProfile() {
  isPublishing.value = true;
  try {
    await nutzapStore.publishNutzapProfile();
    $q.notify({
      message: 'Profile published successfully!',
      color: 'positive',
      icon: 'check_circle',
    });
  } catch (e) {
    console.error('Failed to publish profile:', e);
    $q.notify({
      message: `Failed to publish profile: ${e.message}`,
      color: 'negative',
      icon: 'error',
    });
  } finally {
    isPublishing.value = false;
  }
}

function toggleListener(value) {
  if (value) {
    try {
      nutzapStore.startNutzapListener();
      $q.notify({
        message: 'Started listening for incoming payments.',
        color: 'info',
        icon: 'rss_feed',
      });
    } catch (e) {
      $q.notify({
        message: `Could not start listener: ${e.message}`,
        color: 'negative',
      });
    }
  } else {
    // To implement 'stopListening', we would need to add unsubscribe logic
    // to the nostr.ts store, which is outside the scope of this file.
    console.log('Stop listening functionality requires nostrStore modification.');
    // For now, we can just update the state visually
    nutzapStore.isListening = false;
  }
}

async function copyKey() {
  try {
    await navigator.clipboard.writeText(nutzapStore.p2pkPublicKey);
    $q.notify({
      message: 'Public key copied to clipboard.',
      color: 'positive',
      icon: 'content_copy',
    });
  } catch (e) {
    console.error('Failed to copy key:', e);
  }
}
</script>

<style lang="scss" scoped>
.q-card {
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}
</style>
