
export class WavRecorder {
    private audioContext: AudioContext | null = null;
    private mediaStream: MediaStream | null = null;
    private scriptProcessor: ScriptProcessorNode | null = null;
    private source: MediaStreamAudioSourceNode | null = null;
    private audioBuffers: Float32Array[] = [];
    private recordingLength: number = 0;
    private sampleRate: number = 44100;

    async start() {
        this.audioBuffers = [];
        this.recordingLength = 0;

        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.sampleRate = this.audioContext.sampleRate;

        this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
        // Use ScriptProcessor (bufferSize, inputChannels, outputChannels)
        // 4096 is a good balance for latency/performance
        this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

        this.scriptProcessor.onaudioprocess = (event) => {
            const inputData = event.inputBuffer.getChannelData(0);
            // Clone the data because input buffer is reused
            const bufferCopy = new Float32Array(inputData);
            this.audioBuffers.push(bufferCopy);
            this.recordingLength += bufferCopy.length;
        };

        this.source.connect(this.scriptProcessor);
        this.scriptProcessor.connect(this.audioContext.destination);
    }

    async stop(): Promise<Blob> {
        return new Promise((resolve) => {
            // Stop recording
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => track.stop());
                this.mediaStream = null;
            }
            if (this.source && this.scriptProcessor) {
                this.source.disconnect();
                this.scriptProcessor.disconnect();
                this.source = null;
                this.scriptProcessor = null;
            }
            if (this.audioContext) {
                this.audioContext.close();
                this.audioContext = null;
            }

            // Encode to WAV
            const buffer = this.mergeBuffers(this.audioBuffers, this.recordingLength);
            const wavBlob = this.encodeWAV(buffer);
            resolve(wavBlob);
        });
    }

    cancel() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.audioBuffers = [];
        this.recordingLength = 0;
    }

    private mergeBuffers(buffers: Float32Array[], length: number) {
        const result = new Float32Array(length);
        let offset = 0;
        for (const buffer of buffers) {
            result.set(buffer, offset);
            offset += buffer.length;
        }
        return result;
    }

    private encodeWAV(samples: Float32Array) {
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);

        // RIFF chunk descriptor
        this.writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + samples.length * 2, true);
        this.writeString(view, 8, 'WAVE');

        // fmt sub-chunk
        this.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM (linear quantization)
        view.setUint16(22, 1, true); // Mono
        view.setUint32(24, this.sampleRate, true);
        view.setUint32(28, this.sampleRate * 2, true);
        view.setUint16(32, 2, true); // Block align
        view.setUint16(34, 16, true); // Bits per sample

        // data sub-chunk
        this.writeString(view, 36, 'data');
        view.setUint32(40, samples.length * 2, true);

        // Write PCM samples
        this.floatTo16BitPCM(view, 44, samples);

        return new Blob([view], { type: 'audio/wav' });
    }

    private floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
        for (let i = 0; i < input.length; i++, offset += 2) {
            const s = Math.max(-1, Math.min(1, input[i]));
            output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
    }

    private writeString(view: DataView, offset: number, string: string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }
}
