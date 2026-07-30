type FrameRequest = (callback: FrameRequestCallback) => number;
type FrameCancel = (handle: number) => void;

export type AnimationClockSnapshot = Readonly<{ elapsedMs: number; restartGeneration: number }>;
export type AnimationSubscriber = (snapshot: AnimationClockSnapshot) => void;

export class AnimationClock {
    private subscribers = new Set<AnimationSubscriber>();
    private handle: number | null = null;
    private lastTimestamp: number | null = null;
    private elapsedMs = 0;
    private active = true;
    private restartGeneration = 0;

    constructor(
        private readonly requestFrame: FrameRequest = callback => window.requestAnimationFrame(callback),
        private readonly cancelFrame: FrameCancel = handle => window.cancelAnimationFrame(handle),
    ) {}

    subscribe(subscriber: AnimationSubscriber): () => void {
        this.subscribers.add(subscriber);
        this.ensureRunning();
        return () => {
            this.subscribers.delete(subscriber);
            if (this.subscribers.size === 0) this.stopFrame();
        };
    }

    setActive(active: boolean) {
        if (this.active === active) return;
        this.active = active;
        this.lastTimestamp = null;
        if (active) this.ensureRunning();
        else this.stopFrame();
    }

    restart() {
        this.elapsedMs = 0;
        this.lastTimestamp = null;
        this.restartGeneration += 1;
        const snapshot = this.snapshot;
        this.subscribers.forEach(subscriber => subscriber(snapshot));
        this.ensureRunning();
    }

    dispose() {
        this.stopFrame();
        this.subscribers.clear();
        this.elapsedMs = 0;
        this.lastTimestamp = null;
        this.restartGeneration = 0;
    }

    get snapshot() {
        return { elapsedMs: this.elapsedMs, restartGeneration: this.restartGeneration };
    }

    get subscriberCount() {
        return this.subscribers.size;
    }

    get hasScheduledFrame() {
        return this.handle !== null;
    }

    private ensureRunning() {
        if (!this.active || this.handle !== null || this.subscribers.size === 0) return;
        this.handle = this.requestFrame(timestamp => {
            this.handle = null;
            if (this.lastTimestamp === null) {
                this.lastTimestamp = timestamp;
            } else {
                this.elapsedMs += Math.max(0, timestamp - this.lastTimestamp);
                this.lastTimestamp = timestamp;
            }
            this.subscribers.forEach(subscriber => subscriber(this.snapshot));
            this.ensureRunning();
        });
    }

    private stopFrame() {
        if (this.handle === null) return;
        this.cancelFrame(this.handle);
        this.handle = null;
    }
}

export class SpriteTextureCache {
    private readonly pending = new Map<string, Promise<HTMLImageElement>>();

    load(url: string): Promise<HTMLImageElement> {
        const cached = this.pending.get(url);
        if (cached) return cached;
        const promise = new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error(`Sprite texture failed to load: ${url}`));
            image.src = url;
        });
        this.pending.set(url, promise);
        promise.catch(() => this.pending.delete(url));
        return promise;
    }

    clear() {
        this.pending.clear();
    }

    get size() {
        return this.pending.size;
    }
}

export class SpriteSurfaceRuntime {
    readonly clock: AnimationClock;
    readonly textures = new SpriteTextureCache();

    constructor(clock = new AnimationClock()) {
        this.clock = clock;
    }

    setActive(active: boolean) {
        this.clock.setActive(active);
    }

    dispose() {
        this.clock.dispose();
        this.textures.clear();
    }
}
