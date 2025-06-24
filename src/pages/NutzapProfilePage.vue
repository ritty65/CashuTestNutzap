<template>
  <q-page class="q-pa-md flex flex-center column items-center">
    <div class="text-h5 q-mb-md text-center">Nutzap Profile (beta)</div>

    <q-card class="full-width q-mb-lg" style="max-width:480px">
      <q-card-section class="text-body2">
        Here you’ll be able to create or import a Nostr account
        and publish your Nutzap receiving details.
      </q-card-section>
    </q-card>

    <!-- single set of controls -->
    <q-btn
      label="Generate keys"
      color="primary"
      class="q-mb-md"
      @click="onGenerate"
    />

    <q-input
      v-model="nsecInput"
      label="Paste nsec"
      filled
      class="q-mb-xs"
    />

    <q-btn
      label="Import nsec"
      color="secondary"
      flat
      @click="onImport"
    />

    <div v-if="profile.npub" class="text-caption q-mt-md">
      Your npub: <span class="text-mono">{{ profile.npub }}</span>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useNostrProfile } from 'stores/nostrProfile'

const profile   = useNostrProfile()
const nsecInput = ref('')

function onGenerate () {
  profile.generate()
}

function onImport () {
  try {
    profile.importNsec(nsecInput.value)
    nsecInput.value = ''
  } catch (e: any) {
    alert(e.message)          // TODO replace with Quasar Notify
  }
}
</script>
