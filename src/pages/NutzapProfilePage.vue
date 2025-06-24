<template>
  <q-page class="q-pa-md flex flex-center column items-center">
    <div class="text-h5 q-mb-md text-center">Nutzap Profile (beta)</div>

    <q-card style="max-width:480px;" class="full-width q-mb-lg">
      <q-card-section class="text-body2">
        Here you’ll be able to create or import a Nostr account
        and publish your Nutzap receiving details.
      </q-card-section>
    </q-card>

    <q-btn label="Generate keys" color="primary" class="q-mb-md" />
    <q-input v-model="nsec" label="Paste nsec" filled />
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
const nsec = ref('')
</script>
