// Utility / Hook untuk menangani Card Reader RFID (USB HID / Keyboard Emulator)

export class CardReaderListener {
  private buffer: string = ''
  private timeout: NodeJS.Timeout | null = null
  private onCardScannedCallback: ((cardId: string) => void) | null = null
  private isListening: boolean = false
  private isReadyState: boolean = false

  constructor() {
    this.isReadyState = true
  }

  public getIsReady(): boolean {
    return this.isReadyState
  }

  public startListening(onCard: (cardId: string) => void) {
    if (this.isListening) return
    this.isListening = true
    this.onCardScannedCallback = onCard

    window.addEventListener('keydown', this.handleKeyDown)
  }

  public stopListening() {
    if (!this.isListening) return
    this.isListening = false
    this.onCardScannedCallback = null
    window.removeEventListener('keydown', this.handleKeyDown)
    if (this.timeout) clearTimeout(this.timeout)
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) {
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      const cardId = this.buffer.trim()
      this.buffer = ''
      if (cardId && this.onCardScannedCallback) {
        this.onCardScannedCallback(cardId)
      }
      return
    }

    if (e.key.length === 1) {
      this.buffer += e.key
    }

    if (this.timeout) clearTimeout(this.timeout)
    this.timeout = setTimeout(() => {
      this.buffer = ''
    }, 150)
  }

  public waitForTap(timeoutMs = 30000): Promise<string> {
    return new Promise((resolve, reject) => {
      let buffer = ''
      let timer: NodeJS.Timeout | null = null
      let globalTimer: NodeJS.Timeout | null = null

      const handleKey = (e: KeyboardEvent) => {
        if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) return

        if (e.key === 'Enter') {
          e.preventDefault()
          cleanup()
          resolve(buffer.trim())
          return
        }

        if (e.key.length === 1) {
          buffer += e.key
        }

        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          buffer = ''
        }, 150)
      }

      const cleanup = () => {
        window.removeEventListener('keydown', handleKey)
        if (timer) clearTimeout(timer)
        if (globalTimer) clearTimeout(globalTimer)
      }

      window.addEventListener('keydown', handleKey)

      globalTimer = setTimeout(() => {
        cleanup()
        reject(new Error('Timeout: Tidak ada kartu yang di-scan.'))
      }, timeoutMs)
    })
  }
}

export const cardReader = new CardReaderListener()