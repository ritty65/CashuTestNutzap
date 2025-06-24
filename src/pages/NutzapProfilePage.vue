<template>
  <q-page class="flex flex-center q-pa-md">
    <div class="column items-center" style="max-width: 500px; width: 100%">
      <div class="text-h5 text-center q-mb-md">Nutzap Profile (beta)</div>
      <q-card class="q-mb-lg">
        <q-card-section class="text-body2">
          Here you’ll be able to create or import a Nostr account
          and publish your Nutzap receiving details.
        </q-card-section>
      </q-card>
      <q-btn label="Generate keys" color="primary" class="q-mb-md" />
      <q-input v-model="nsec" label="Paste nsec" filled />
    </div>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'

const nsec = ref('')
</script>
