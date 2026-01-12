import { Caption } from '../lib/types';

export class YouTubeCaptionExtractor {
  private videoElement: HTMLVideoElement | null = null;
  private captionObserver: MutationObserver | null = null;
  private lastCaptionText = '';

  constructor() {
    this.findVideoElement();
  }

  private findVideoElement() {
    this.videoElement = document.querySelector('video.html5-main-video');
    if (!this.videoElement) {
      console.warn('YouTube video element not found');
      // Try again after a delay
      setTimeout(() => this.findVideoElement(), 1000);
    } else {
      console.log('Video element found:', this.videoElement);
    }
  }

  async extractCaptions(): Promise<Caption[]> {
    console.log('Starting caption extraction...');
    
    // Try to extract from <track> element first
    const trackCaptions = await this.extractFromTrack();
    if (trackCaptions.length > 0) {
      console.log(`Extracted ${trackCaptions.length} captions from track`);
      return trackCaptions;
    }

    // Fallback: create live captions from DOM observation
    console.log('Using DOM-based caption extraction');
    this.startDOMObservation();
    
    // Return empty array for now - captions will be generated live
    return [];
  }

  private async extractFromTrack(): Promise<Caption[]> {
    if (!this.videoElement) return [];

    // Find caption track
    const tracks = this.videoElement.textTracks;
    let captionTrack: TextTrack | null = null;

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      if (track.kind === 'captions' || track.kind === 'subtitles') {
        captionTrack = track;
        break;
      }
    }

    if (!captionTrack) return [];

    // Enable track
    captionTrack.mode = 'hidden';

    // Wait for cues to load
    await new Promise((resolve) => setTimeout(resolve, 500));

    const captions: Caption[] = [];
    if (captionTrack.cues) {
      for (let i = 0; i < captionTrack.cues.length; i++) {
        const cue = captionTrack.cues[i] as VTTCue;
        captions.push({
          text: cue.text.replace(/<[^>]*>/g, ''), // Strip HTML tags
          start: cue.startTime,
          end: cue.endTime,
        });
      }
    }

    return captions;
  }

  private startDOMObservation() {
    // Observe caption container for changes
    const captionContainer = document.querySelector('.ytp-caption-window-container');
    if (!captionContainer) {
      console.warn('Caption container not found, will retry...');
      setTimeout(() => this.startDOMObservation(), 2000);
      return;
    }

    console.log('Starting caption DOM observation');

    this.captionObserver = new MutationObserver(() => {
      const segments = document.querySelectorAll('.ytp-caption-segment');
      if (segments.length > 0) {
        const text = Array.from(segments)
          .map(s => s.textContent)
          .join(' ')
          .trim();
        
        if (text && text !== this.lastCaptionText) {
          this.lastCaptionText = text;
          console.log('Caption updated:', text);
        }
      }
    });

    this.captionObserver.observe(captionContainer, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  getCurrentCaption(): Caption | null {
    const segments = document.querySelectorAll('.ytp-caption-segment');
    if (segments.length === 0) return null;

    const text = Array.from(segments)
      .map(s => s.textContent)
      .join(' ')
      .trim();
    
    if (!text) return null;

    const currentTime = this.getCurrentTime();
    return {
      text,
      start: currentTime,
      end: currentTime + 3, // Estimate 3 seconds duration
    };
  }

  stopObservation() {
    if (this.captionObserver) {
      this.captionObserver.disconnect();
      this.captionObserver = null;
    }
  }

  getCurrentTime(): number {
    return this.videoElement?.currentTime || 0;
  }

  seekTo(time: number) {
    if (this.videoElement) {
      this.videoElement.currentTime = time;
    }
  }

  play() {
    this.videoElement?.play();
  }

  pause() {
    this.videoElement?.pause();
  }

  getVideoInfo() {
    const url = window.location.href;
    const videoId = new URL(url).searchParams.get('v') || '';
    
    // Extract video title
    const titleElement = document.querySelector('h1.ytd-watch-metadata yt-formatted-string');
    const videoTitle = titleElement?.textContent || 'Unknown Video';
    
    // Extract channel name
    const channelElement = document.querySelector('ytd-channel-name a');
    const channel = channelElement?.textContent || 'Unknown Channel';

    return {
      videoId,
      videoUrl: url,
      videoTitle,
      channel,
    };
  }
}
