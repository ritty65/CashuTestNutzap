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

    <div v-if="profile.npub" class="q-mt-md" style="max-width:480px; width:100%">
      <q-input
        v-model="hiddenNpub"
        label="npub"
        outlined
        readonly
        class="q-mb-sm"
      >
        <template v-slot:append>
          <q-btn
            flat
            dense
            icon="visibility"
            class="cursor-pointer q-mt-md"
            @click="toggleKeyVisibility"
          ></q-btn>
        </template>
      </q-input>
      <q-input
        v-model="hiddenNsec"
        label="nsec"
        outlined
        readonly
        class="q-mb-sm"
      >
        <template v-slot:append>
          <q-btn
            flat
            dense
            icon="visibility"
            class="cursor-pointer q-mt-md"
            @click="toggleKeyVisibility"
          ></q-btn>
        </template>
      </q-input>
      <q-select
        v-model="selectedMint"
        :options="mints.mints.map(m => m.url)"
        label="Mint URL"
        outlined
        class="q-mb-sm"
      />
      <q-input
        v-model="relayList"
        type="textarea"
        label="Relays"
        outlined
        class="q-mb-sm"
      />
      <q-btn label="Publish profile" @click="onPublish" color="primary" class="q-mb-sm"/>
      <q-toggle
        label="Listen for incoming Nutzaps"
        v-model="nutzap.listening"
        @update:model-value="val => val ? nutzap.startListener(relayList.split('\n')) : nutzap.stopListener()"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNostrProfile } from 'stores/nostrProfile'
import { useNutzapStore } from 'stores/nutzap'
import { useMintsStore } from 'stores/mints'

const profile   = useNostrProfile()
const nutzap    = useNutzapStore()
const mints     = useMintsStore()
const nsecInput = ref('')
const hideKeys  = ref(true)
const selectedMint = ref('')
const relayList    = ref('wss://relay.damus.io\nwss://nos.lol')

const hiddenNpub = computed(() => {
  if (!profile.npub) return ''
  return hideKeys.value ? '*'.repeat(profile.npub.length) : profile.npub
})

const hiddenNsec = computed(() => {
  if (!profile.nsec) return ''
  return hideKeys.value ? '*'.repeat(profile.nsec.length) : profile.nsec
})

function toggleKeyVisibility () {
  hideKeys.value = !hideKeys.value
}

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

async function onPublish () {
  await nutzap.publishProfile(
    selectedMint.value,
    relayList.value.split('\n').map(r => r.trim()).filter(Boolean)
  )
}
</script>

