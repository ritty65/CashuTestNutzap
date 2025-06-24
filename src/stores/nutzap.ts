import { defineStore } from 'pinia'
import { NDKSubscription, NDKFilter } from '@nostr-dev-kit/ndk'
import { useNostrStore } from './nostr'
import { useP2PKStore } from './p2pk'
import { useReceiveTokensStore } from './receiveTokensStore'

export const useNutzapStore = defineStore('nutzap', {
  state: () => ({
    profilePublishedAt: 0,
    listening: false,
    inboxSub: null as NDKSubscription | null
  }),

  actions: {
    async publishProfile(mintUrl: string, relays: string[]) {
      const nostr = useNostrStore()
      const p2pk = useP2PKStore()
      if (!nostr.pubkey || !p2pk.pubKeyHex) throw new Error('keys missing')

      const evt = {
        kind: 10019,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['mint', mintUrl, 'sat'],
          ['relay', ...relays],
          ['pubkey', '02' + p2pk.pubKeyHex]
        ],
        content: ''
      }
      const signed = await nostr.signEvent(evt)
      await nostr.publish(signed, relays)
      this.profilePublishedAt = evt.created_at
    },

    async startListener(relays: string[]) {
      if (this.listening) return
      const nostr = useNostrStore()
      const p2pk = useP2PKStore()
      const filter: NDKFilter = {
        kinds: [23197],
        '#recipient': [p2pk.pubKeyHex]
      }
      this.inboxSub = nostr.subscribe(filter, relays, async ev => {
        try {
          await this._handleToken(ev.content)
        } catch (e) {
          console.error('Nutzap claim failed', e)
        }
      })
      this.listening = true
    },

    async stopListener() {
      this.inboxSub?.stop()
      this.inboxSub = null
      this.listening = false
    },

    async _handleToken(token: string) {
      const receive = useReceiveTokensStore()
      receive.receiveData.tokensBase64 = token
      await receive.receiveToken(token)
    }
  }
})
