/**
 * ==============================================================================
 * FogResolve(AI) - Main Application Logic
 * ==============================================================================
 * 
 * ARCHITECTURE OVERVIEW:
 * ----------------------
 * This application uses a scene-based narrative structure with smooth transitions,
 * dynamic bubble interactions, and immersive audio. Content is paginated for
 * readability and scenes transition through configurable animation sequences.
 * 
 * CORE COMPONENTS:
 * ----------------
 * 1. AudioManager: Handles ambient audio layers, transition sounds, and pop effects
 * 2. Bubble System: Dynamic size/content based on sentence count, with pagination
 * 3. Scene Transitions: Configurable transitions via TRANSITIONS object
 * 4. Keyboard Shortcuts: Development shortcuts for quick scene navigation (1-5 keys)
 * 
 * REUSABLE PATTERNS:
 * ------------------
 * 
 * [Bubble Component]
 * - Auto-sizes based on sentence count (exponential growth, max 5 sentences = 710px)
 * - Pagination: 5 sentences per page, "Volgende" → "Pop!" flow
 * - Three-phase expansion: size → background → content fade-in
 * - Staggered sentence animation with adaptive timing
 * 
 * [Scene Transition Component - TRANSITIONS object]
 * - Configure transitions with duration, audio fade timings
 * - Separate onStart and onComplete callbacks for animation phases
 * - Pattern: Fade old trees → Bring in new trees → Adjust fog/background
 * - Used between scenes 2-3, extendable to 3-4, 4-5, etc.
 * 
 * [Audio System]
 * - Three-layer ambient audio (frogs, night, insects) with scene-specific volumes
 * - Continuous playback across scenes (adjust volumes, don't restart)
 * - Transition audio (Steps.wav) with fade-to-level during scene changes
 * - Pop sound effects for bubble interactions
 * 
 * ADDING NEW CONTENT:
 * -------------------
 * - Bubbles: Add template in HTML, wrap sentences in <span class="sentence">
 * - Scenes: Add transition config to TRANSITIONS object, create template in HTML
 * - Audio: Configure volumes in earlySceneAudio/lateSceneAudio constants
 * 
 * ==============================================================================
 */

// ==============================================================================
// COMPONENT: Audio Manager
// ==============================================================================
// Manages ambient audio layers, transition sounds, and effects
class AudioManager {
  constructor() {
    this.ambientAudio = null;
    this.ambientLayers = new Map(); // id => Audio element for layered ambiance
    this.currentScene = 1;
    this.audioEnabled = true;
    this.audioInitialized = false;
    this.pendingSceneAudio = null;
    this.transitionAudio = null; // Track long transition audio
    this.introAudio = null; // Track intro audio for first bubble
    this.copilotAudio = null; // Track Copilot audio for alpha bubble
    this.chat1Audio = null; // Track Chat1 audio for beta bubble page 1
    this.chat2Audio = null; // Track Chat2 audio for beta bubble page 2
    this.watIsAIAudio = null; // Track WatisAI audio for gamma bubble
    this.geneveAudio = null; // Track Geneve audio for delta bubble
    this.paulBlokAudio = null; // Track Paul Blok audio for epsilon bubble
    this.michielAudio = null; // Track Michiel audio for zeta bubble
    this.joeyAudio = null; // Track Joey audio for eta bubble
    this.kathleenAudio = null; // Track Kathleen audio for theta bubble
    this.mariekeAudio = null; // Track Marieke audio for iota bubble
    this.rronNushiAudio = null; // Track Rron Nushi audio for kappa bubble
    this.rawazAudio = null; // Track Rawaz audio for lambda bubble
    this.tobias1Audio = null; // Track Tobias1 audio for tobias bubble page 1
    this.tobias2Audio = null; // Track Tobias2 audio for tobias bubble page 2
    this.crowSoundTimeout = null; // Track scheduled crow sound
    this.birdLayers = new Map(); // Scene 9 bird ambient
  }

  // Initialize audio manager
  init() {
    // Start audio immediately (muted to comply with autoplay policy)
    this.audioInitialized = true;
    this.playAmbient(1); // Start Scene 1 audio immediately
    
    // Unmute audio on first user interaction
    document.addEventListener('click', () => this.unmuteAudio(), { once: true });
  }

  unmuteAudio() {
    // Unmute all ambient layers and ensure they're playing
    this.ambientLayers.forEach((audio, id) => {
      audio.muted = false;
      if (audio.paused) {
        audio.play().catch(e => console.log(`Failed to play ${id} after unmute:`, e));
      }
    });
  }

  // Play layered ambient background sounds (multiple soundscapes simultaneously)
  playAmbient(sceneNum) {
    // If audio not yet initialized by user interaction, queue it for Scene 1
    if (!this.audioInitialized && sceneNum === 1) {
      this.pendingSceneAudio = sceneNum;
      return;
    }

    if (!this.audioEnabled) return;

    // Define layered ambiance per scene: { id, file, volume }
    // Scenes 1-2: frogs(1) night(1) insects(2), Scenes 3-5: frogs(1) night(2) insects(1)
    const earlySceneAudio = [
      { id: 'frogs', file: 'frogs.mp3', volume: 0.25 },
      { id: 'night', file: 'night.mp3', volume: 0.25 },
      { id: 'insects', file: 'insects.mp3', volume: 0.5 }
    ];
    const lateSceneAudio = [
      { id: 'frogs', file: 'frogs.mp3', volume: 0.25 },
      { id: 'night', file: 'night.mp3', volume: 0.5 },
      { id: 'insects', file: 'insects.mp3', volume: 0.25 }
    ];
    const sceneConfig = {
      1: earlySceneAudio,
      2: earlySceneAudio,
      3: lateSceneAudio,
      4: lateSceneAudio,
      5: lateSceneAudio
    };

    const config = sceneConfig[sceneNum];
    if (!config) {
      console.log(`No ambient audio configured for Scene ${sceneNum}`);
      return;
    }

    // If layers already exist, just adjust volumes (continuous audio)
    if (this.ambientLayers.size > 0) {
      config.forEach((layer) => {
        const audio = this.ambientLayers.get(layer.id);
        if (audio) {
          audio.volume = layer.volume;
        }
      });
      return;
    }

    // First time: Start each layer simultaneously
    config.forEach((layer) => {
      const audioPath = `assets/audio/${layer.file}`;
      const audio = new Audio(audioPath);
      audio.loop = true;
      audio.volume = layer.volume;
      // Start muted (for autoplay compliance), will unmute on first click
      audio.muted = true;
      audio.play()
        .then(() => console.log(`Ambient layer ${layer.id} started (muted)`))
        .catch(e => console.log(`Ambient layer ${layer.id} play failed:`, e));
      this.ambientLayers.set(layer.id, audio);
    });
  }

  // Play transition/swoosh effect
  playTransition(audioFile = 'Swoosh.wav', loop = false, volume = 0.7) {
    if (!this.audioEnabled) return;
    
    // Stop any existing transition audio
    if (this.transitionAudio) {
      this.transitionAudio.pause();
      this.transitionAudio.currentTime = 0;
      this.transitionAudio = null;
    }
    
    const audio = new Audio(`assets/audio/${audioFile}`);
    audio.volume = volume;
    audio.loop = loop;
    audio.play().catch(e => console.log('Transition audio play failed:', e));
    
    if (loop) {
      this.transitionAudio = audio;
    }
  }
  
  // Stop any playing transition audio
  stopTransition() {
    if (this.transitionAudio) {
      this.transitionAudio.pause();
      this.transitionAudio.currentTime = 0;
      this.transitionAudio = null;
    }
  }

  // Play bubble pop sound effect
  playPopSound() {
    if (!this.audioEnabled) return;
    
    // Try .wav first, fallback to .mp3 if it fails
    const audio = new Audio('assets/audio/BubblePopRev.wav');
    audio.volume = 0.6;
    audio.play().catch(e => {
      // Try .mp3 format as fallback
      const audioMp3 = new Audio('assets/audio/Bubble-pop.mp3');
      audioMp3.volume = 0.6;
      audioMp3.play().catch(err => console.log('Pop audio play failed:', err));
    });
  }

  // Play intro audio for first bubble
  playIntroAudio() {
    if (!this.audioEnabled) return;
    
    // Stop any existing intro audio first
    if (this.introAudio) {
      this.introAudio.pause();
      this.introAudio.currentTime = 0;
    }
    
    this.introAudio = new Audio('assets/audio/Intro.mp3');
    this.introAudio.volume = 0.5;
    this.introAudio.loop = false;
    this.introAudio.play().catch(e => console.log('Intro audio play failed:', e));
    console.log('[AUDIO] Started playing Intro.mp3');
  }

  // Stop intro audio
  stopIntroAudio() {
    if (this.introAudio) {
      this.introAudio.pause();
      this.introAudio.currentTime = 0;
      this.introAudio = null;
      console.log('[AUDIO] Stopped Intro.mp3');
    }
  }

  // Play Copilot audio for alpha bubble
  playCopilotAudio() {
    if (!this.audioEnabled) return;
    
    // Stop any existing Copilot audio first
    if (this.copilotAudio) {
      this.copilotAudio.pause();
      this.copilotAudio.currentTime = 0;
    }
    
    this.copilotAudio = new Audio('assets/audio/Copilot.mp3');
    this.copilotAudio.volume = 0.5;
    this.copilotAudio.loop = false;
    this.copilotAudio.play().catch(e => console.log('Copilot audio play failed:', e));
    console.log('[AUDIO] Started playing Copilot.mp3');
  }

  // Stop Copilot audio
  stopCopilotAudio() {
    if (this.copilotAudio) {
      this.copilotAudio.pause();
      this.copilotAudio.currentTime = 0;
      this.copilotAudio = null;
      console.log('[AUDIO] Stopped Copilot.mp3');
    }
  }

  // Play Chat1 audio for beta bubble (page 1)
  playChat1Audio() {
    if (!this.audioEnabled) return;
    
    // Stop any existing Chat1 audio first
    if (this.chat1Audio) {
      this.chat1Audio.pause();
      this.chat1Audio.currentTime = 0;
    }
    
    this.chat1Audio = new Audio('assets/audio/Chat1.mp3');
    this.chat1Audio.volume = 0.5;
    this.chat1Audio.loop = false;
    this.chat1Audio.play().catch(e => console.log('Chat1 audio play failed:', e));
    console.log('[AUDIO] Started playing Chat1.mp3');
  }

  // Stop Chat1 audio
  stopChat1Audio() {
    if (this.chat1Audio) {
      this.chat1Audio.pause();
      this.chat1Audio.currentTime = 0;
      this.chat1Audio = null;
      console.log('[AUDIO] Stopped Chat1.mp3');
    }
  }

  // Play Chat2 audio for beta bubble (page 2)
  playChat2Audio() {
    if (!this.audioEnabled) return;
    
    // Stop any existing Chat2 audio first
    if (this.chat2Audio) {
      this.chat2Audio.pause();
      this.chat2Audio.currentTime = 0;
    }
    
    this.chat2Audio = new Audio('assets/audio/Chat2.mp3');
    this.chat2Audio.volume = 0.5;
    this.chat2Audio.loop = false;
    this.chat2Audio.play().catch(e => console.log('Chat2 audio play failed:', e));
    console.log('[AUDIO] Started playing Chat2.mp3');
  }

  // Stop Chat2 audio
  stopChat2Audio() {
    if (this.chat2Audio) {
      this.chat2Audio.pause();
      this.chat2Audio.currentTime = 0;
      this.chat2Audio = null;
      console.log('[AUDIO] Stopped Chat2.mp3');
    }
  }

  // Play WatisAI audio for gamma bubble
  playWatIsAIAudio() {
    if (!this.audioEnabled) return;
    
    // Stop any existing WatisAI audio first
    if (this.watIsAIAudio) {
      this.watIsAIAudio.pause();
      this.watIsAIAudio.currentTime = 0;
    }
    
    this.watIsAIAudio = new Audio('assets/audio/WatisAI.mp3');
    this.watIsAIAudio.volume = 0.5;
    this.watIsAIAudio.loop = false;
    this.watIsAIAudio.play().catch(e => console.log('WatisAI audio play failed:', e));
    console.log('[AUDIO] Started playing WatisAI.mp3');
  }

  // Stop WatisAI audio
  stopWatIsAIAudio() {
    if (this.watIsAIAudio) {
      this.watIsAIAudio.pause();
      this.watIsAIAudio.currentTime = 0;
      this.watIsAIAudio = null;
      console.log('[AUDIO] Stopped WatisAI.mp3');
    }
  }

  // Play Geneve audio for delta bubble
  playGeneveAudio() {
    if (!this.audioEnabled) return;
    
    // Stop any existing Geneve audio first
    if (this.geneveAudio) {
      this.geneveAudio.pause();
      this.geneveAudio.currentTime = 0;
    }
    
    this.geneveAudio = new Audio('assets/audio/Geneve Angelista.mp3');
    this.geneveAudio.volume = 0.5;
    this.geneveAudio.loop = false;
    this.geneveAudio.play().catch(e => console.log('Geneve audio play failed:', e));
    console.log('[AUDIO] Started playing Geneve Angelista.mp3');
  }

  // Stop Geneve audio
  stopGeneveAudio() {
    if (this.geneveAudio) {
      this.geneveAudio.pause();
      this.geneveAudio.currentTime = 0;
      this.geneveAudio = null;
      console.log('[AUDIO] Stopped Geneve Angelista.mp3');
    }
  }

  // Play Paul Blok audio for epsilon bubble
  playPaulBlokAudio() {
    if (!this.audioEnabled) return;
    
    // Stop any existing Paul Blok audio first
    if (this.paulBlokAudio) {
      this.paulBlokAudio.pause();
      this.paulBlokAudio.currentTime = 0;
    }
    
    this.paulBlokAudio = new Audio('assets/audio/Paul Blok.mp3');
    this.paulBlokAudio.volume = 0.5;
    this.paulBlokAudio.loop = false;
    this.paulBlokAudio.play().catch(e => console.log('Paul Blok audio play failed:', e));
    console.log('[AUDIO] Started playing Paul Blok.mp3');
  }

  // Stop Paul Blok audio
  stopPaulBlokAudio() {
    if (this.paulBlokAudio) {
      this.paulBlokAudio.pause();
      this.paulBlokAudio.currentTime = 0;
      this.paulBlokAudio = null;
      console.log('[AUDIO] Stopped Paul Blok.mp3');
    }
  }

  // Play Michiel audio for zeta bubble
  playMichielAudio() {
    if (!this.audioEnabled) return;
    
    // Stop any existing Michiel audio first
    if (this.michielAudio) {
      this.michielAudio.pause();
      this.michielAudio.currentTime = 0;
    }
    
    this.michielAudio = new Audio('assets/audio/Michiel Bernsen.mp3');
    this.michielAudio.volume = 0.5;
    this.michielAudio.loop = false;
    this.michielAudio.play().catch(e => console.log('Michiel audio play failed:', e));
    console.log('[AUDIO] Started playing Michiel Bernsen.mp3');
  }

  // Stop Michiel audio
  stopMichielAudio() {
    if (this.michielAudio) {
      this.michielAudio.pause();
      this.michielAudio.currentTime = 0;
      this.michielAudio = null;
      console.log('[AUDIO] Stopped Michiel Bernsen.mp3');
    }
  }

  // Play Joey audio for eta bubble
  playJoeyAudio() {
    if (!this.audioEnabled) return;
    
    // Stop any existing Joey audio first
    if (this.joeyAudio) {
      this.joeyAudio.pause();
      this.joeyAudio.currentTime = 0;
    }
    
    this.joeyAudio = new Audio('assets/audio/Joey.mp3');
    this.joeyAudio.volume = 0.5;
    this.joeyAudio.loop = false;
    this.joeyAudio.play().catch(e => console.log('Joey audio play failed:', e));
    console.log('[AUDIO] Started playing Joey.mp3');
  }

  // Stop Joey audio
  stopJoeyAudio() {
    if (this.joeyAudio) {
      this.joeyAudio.pause();
      this.joeyAudio.currentTime = 0;
      this.joeyAudio = null;
      console.log('[AUDIO] Stopped Joey.mp3');
    }
  }

  // Play Kathleen audio for theta bubble
  playKathleenAudio() {
    if (!this.audioEnabled) return;
    
    // Stop any existing Kathleen audio first
    if (this.kathleenAudio) {
      this.kathleenAudio.pause();
      this.kathleenAudio.currentTime = 0;
    }
    
    this.kathleenAudio = new Audio('assets/audio/Kathleen van Dam.mp3');
    this.kathleenAudio.volume = 0.5;
    this.kathleenAudio.loop = false;
    this.kathleenAudio.play().catch(e => console.log('Kathleen audio play failed:', e));
    console.log('[AUDIO] Started playing Kathleen van Dam.mp3');
  }

  // Stop Kathleen audio
  stopKathleenAudio() {
    if (this.kathleenAudio) {
      this.kathleenAudio.pause();
      this.kathleenAudio.currentTime = 0;
      this.kathleenAudio = null;
      console.log('[AUDIO] Stopped Kathleen van Dam.mp3');
    }
  }

  // Play Marieke audio for iota bubble
  playMariekeAudio() {
    if (!this.audioEnabled) return;
    
    // Stop any existing Marieke audio first
    if (this.mariekeAudio) {
      this.mariekeAudio.pause();
      this.mariekeAudio.currentTime = 0;
    }
    
    this.mariekeAudio = new Audio('assets/audio/MariekeMol.mp3');
    this.mariekeAudio.volume = 0.5;
    this.mariekeAudio.loop = false;
    this.mariekeAudio.play().catch(e => console.log('Marieke audio play failed:', e));
    console.log('[AUDIO] Started playing MariekeMol.mp3');
  }

  // Stop Marieke audio
  stopMariekeAudio() {
    if (this.mariekeAudio) {
      this.mariekeAudio.pause();
      this.mariekeAudio.currentTime = 0;
      this.mariekeAudio = null;
      console.log('[AUDIO] Stopped MariekeMol.mp3');
    }
  }

  // Play Rron Nushi audio for kappa bubble
  playRronNushiAudio() {
    if (!this.audioEnabled) return;
    
    // Stop any existing Rron Nushi audio first
    if (this.rronNushiAudio) {
      this.rronNushiAudio.pause();
      this.rronNushiAudio.currentTime = 0;
    }
    
    this.rronNushiAudio = new Audio('assets/audio/RronNushi.mp3');
    this.rronNushiAudio.volume = 0.5;
    this.rronNushiAudio.loop = false;
    this.rronNushiAudio.play().catch(e => console.log('Rron Nushi audio play failed:', e));
    console.log('[AUDIO] Started playing RronNushi.mp3');
  }

  // Stop Rron Nushi audio
  stopRronNushiAudio() {
    if (this.rronNushiAudio) {
      this.rronNushiAudio.pause();
      this.rronNushiAudio.currentTime = 0;
      this.rronNushiAudio = null;
      console.log('[AUDIO] Stopped RronNushi.mp3');
    }
  }

  // Play Rawaz audio for lambda bubble
  playRawazAudio() {
    if (!this.audioEnabled) return;
    
    // Stop any existing Rawaz audio first
    if (this.rawazAudio) {
      this.rawazAudio.pause();
      this.rawazAudio.currentTime = 0;
    }
    
    this.rawazAudio = new Audio('assets/audio/RawazTahir.mp3');
    this.rawazAudio.volume = 0.5;
    this.rawazAudio.loop = false;
    this.rawazAudio.play().catch(e => console.log('Rawaz audio play failed:', e));
    console.log('[AUDIO] Started playing RawazTahir.mp3');
  }

  // Stop Rawaz audio
  stopRawazAudio() {
    if (this.rawazAudio) {
      this.rawazAudio.pause();
      this.rawazAudio.currentTime = 0;
      this.rawazAudio = null;
      console.log('[AUDIO] Stopped RawazTahir.mp3');
    }
  }

  // Play Tobias1 audio for tobias bubble (page 1)
  playTobias1Audio() {
    if (!this.audioEnabled) return;
    
    // Stop any existing Tobias1 audio first
    if (this.tobias1Audio) {
      this.tobias1Audio.pause();
      this.tobias1Audio.currentTime = 0;
    }
    
    this.tobias1Audio = new Audio('assets/audio/Tobias1.mp3');
    this.tobias1Audio.volume = 0.5;
    this.tobias1Audio.loop = false;
    this.tobias1Audio.play().catch(e => console.log('Tobias1 audio play failed:', e));
    console.log('[AUDIO] Started playing Tobias1.mp3');
  }

  // Stop Tobias1 audio
  stopTobias1Audio() {
    if (this.tobias1Audio) {
      this.tobias1Audio.pause();
      this.tobias1Audio.currentTime = 0;
      this.tobias1Audio = null;
      console.log('[AUDIO] Stopped Tobias1.mp3');
    }
  }

  // Play Tobias2 audio for tobias bubble (page 2)
  playTobias2Audio() {
    if (!this.audioEnabled) return;
    
    // Stop any existing Tobias2 audio first
    if (this.tobias2Audio) {
      this.tobias2Audio.pause();
      this.tobias2Audio.currentTime = 0;
    }
    
    this.tobias2Audio = new Audio('assets/audio/Tobias2.mp3');
    this.tobias2Audio.volume = 0.5;
    this.tobias2Audio.loop = false;
    this.tobias2Audio.play().catch(e => console.log('Tobias2 audio play failed:', e));
    console.log('[AUDIO] Started playing Tobias2.mp3');
  }

  // Stop Tobias2 audio
  stopTobias2Audio() {
    if (this.tobias2Audio) {
      this.tobias2Audio.pause();
      this.tobias2Audio.currentTime = 0;
      this.tobias2Audio = null;
      console.log('[AUDIO] Stopped Tobias2.mp3');
    }
  }

  // Play crow sound effect (scene 1 only, no loop)
  playCrowSound() {
    if (!this.audioEnabled) return;
    
    const audio = new Audio('assets/audio/crow-sfx-318131.mp3');
    audio.volume = 0.5;
    audio.loop = false;
    audio.play().catch(e => console.log('Crow sound play failed:', e));
    console.log('[AUDIO] Playing crow sound');
    
    // Trigger crow flight animation
    const crowContainer = document.getElementById('crow-container');
    if (crowContainer) {
      crowContainer.classList.add('flying');
      // Remove class after animation completes to allow re-triggering
      setTimeout(() => {
        crowContainer.classList.remove('flying');
      }, 2500);
    }
  }

  // Cancel scheduled crow sound
  cancelCrowSound() {
    if (this.crowSoundTimeout) {
      clearTimeout(this.crowSoundTimeout);
      this.crowSoundTimeout = null;
      console.log('[AUDIO] Crow sound cancelled');
    }
  }

  // Fade ambient to a specific volume level (0-1) without stopping
  fadeAmbientToLevel(targetLevel, duration = 500) {
    if (this.ambientLayers.size === 0) return;

    const steps = 50;
    const stepDuration = duration / steps;
    const startVolumes = new Map();
    
    // Store initial volumes
    this.ambientLayers.forEach((audio, id) => {
      startVolumes.set(id, audio.volume);
    });

    let step = 0;

    const fadeInterval = setInterval(() => {
      step++;
      const progress = step / steps;
      
      this.ambientLayers.forEach((audio, id) => {
        const startVol = startVolumes.get(id);
        audio.volume = startVol * (1 - progress * (1 - targetLevel));
      });
      
      if (step >= steps) {
        clearInterval(fadeInterval);
      }
    }, stepDuration);
  }

  // Fade out all ambient layers
  fadeOutAmbient(duration = 500) {
    if (this.ambientLayers.size === 0) return;

    const steps = 50;
    const stepDuration = duration / steps;
    const startVolumes = new Map();
    
    // Store initial volumes
    this.ambientLayers.forEach((audio, id) => {
      startVolumes.set(id, audio.volume);
    });

    let step = 0;

    const fadeInterval = setInterval(() => {
      step++;
      const progress = step / steps;
      
      this.ambientLayers.forEach((audio, id) => {
        const startVol = startVolumes.get(id);
        audio.volume = startVol * (1 - progress);
      });
      
      if (step >= steps) {
        clearInterval(fadeInterval);
        this.ambientLayers.forEach((audio) => {
          audio.pause();
          audio.currentTime = 0;
        });
      }
    }, stepDuration);
  }

  // Fade in all ambient layers smoothly
  fadeInAmbient(duration = 800) {
    if (this.ambientLayers.size === 0) return;

    const steps = 50;
    const stepDuration = duration / steps;
    const targetVolumes = new Map();
    
    // Get target volumes from config and start at 0
    this.ambientLayers.forEach((audio, id) => {
      targetVolumes.set(id, audio.volume);
      audio.volume = 0;
    });

    let step = 0;

    const fadeInterval = setInterval(() => {
      step++;
      const progress = step / steps;
      
      this.ambientLayers.forEach((audio, id) => {
        const targetVol = targetVolumes.get(id);
        audio.volume = targetVol * progress;
      });
      
      if (step >= steps) {
        clearInterval(fadeInterval);
        // Ensure final volumes are exact
        this.ambientLayers.forEach((audio, id) => {
          audio.volume = targetVolumes.get(id);
        });
      }
    }, stepDuration);
  }

  // Switch to Scene 9 ambient: fade out frogs/night/insects, fade in birdsong1+2
  switchToScene9Ambient(fadeOutDuration = 1200, fadeInDuration = 1200) {
    // Fade out and stop existing ambient layers
    if (this.ambientLayers.size > 0) {
      const steps = 50;
      const stepDuration = fadeOutDuration / steps;
      const startVolumes = new Map();
      this.ambientLayers.forEach((audio, id) => startVolumes.set(id, audio.volume));
      let step = 0;
      const fadeInterval = setInterval(() => {
        step++;
        const progress = step / steps;
        this.ambientLayers.forEach((audio, id) => {
          const startVol = startVolumes.get(id);
          audio.volume = startVol * (1 - progress);
        });
        if (step >= steps) {
          clearInterval(fadeInterval);
          this.ambientLayers.forEach(audio => { try { audio.pause(); audio.currentTime = 0; } catch(e){} });
          this.ambientLayers.clear();
          // Now start bird layers
          const birds = [
            { id: 'bird1', file: 'Birdsong1.mp3', volume: 0.6 },
            { id: 'bird2', file: 'Birdsong2.mp3', volume: 0.6 }
          ];
          birds.forEach(layer => {
            const audioPath = `assets/audio/${layer.file}`;
            const audio = new Audio(audioPath);
            audio.loop = true;
            audio.volume = 0; // start at 0, fade in
            audio.muted = false;
            audio.play().catch(e => console.log(`Bird ambient ${layer.id} play failed:`, e));
            this.birdLayers.set(layer.id, audio);
          });
          // Fade in birds
          const stepsIn = 50;
          const stepDurIn = fadeInDuration / stepsIn;
          let stepIn = 0;
          const targetVolumes = new Map([
            ['bird1', 0.6],
            ['bird2', 0.6]
          ]);
          const fadeInInterval = setInterval(() => {
            stepIn++;
            const progressIn = stepIn / stepsIn;
            this.birdLayers.forEach((audio, id) => {
              const target = targetVolumes.get(id) || 0.6;
              audio.volume = target * progressIn;
            });
            if (stepIn >= stepsIn) {
              clearInterval(fadeInInterval);
              // ensure exact targets
              this.birdLayers.forEach((audio, id) => {
                const target = targetVolumes.get(id) || 0.6;
                audio.volume = target;
              });
            }
          }, stepDurIn);
        }
      }, stepDuration);
    } else {
      // No prior ambient: just start birds
      const birds = [
        { id: 'bird1', file: 'Birdsong1.mp3', volume: 0.6 },
        { id: 'bird2', file: 'Birdsong2.mp3', volume: 0.6 }
      ];
      birds.forEach(layer => {
        const audioPath = `assets/audio/${layer.file}`;
        const audio = new Audio(audioPath);
        audio.loop = true;
        audio.volume = 0;
        audio.play().catch(e => console.log(`Bird ambient ${layer.id} play failed:`, e));
        this.birdLayers.set(layer.id, audio);
      });
      this.fadeInBirdAmbient(fadeInDuration);
    }
  }

  // Fade in bird ambient helper
  fadeInBirdAmbient(duration = 1000) {
    if (this.birdLayers.size === 0) return;
    const steps = 50; const stepDuration = duration / steps;
    const targetVolumes = new Map();
    this.birdLayers.forEach((audio, id) => { targetVolumes.set(id, 0.6); audio.volume = 0; });
    let step = 0;
    const interval = setInterval(() => {
      step++;
      const progress = step / steps;
      this.birdLayers.forEach((audio, id) => {
        const target = targetVolumes.get(id) || 0.6;
        audio.volume = target * progress;
      });
      if (step >= steps) {
        clearInterval(interval);
        this.birdLayers.forEach((audio, id) => { audio.volume = targetVolumes.get(id) || 0.6; });
      }
    }, stepDuration);
  }

}

// Initialize global audio manager
const audioManager = new AudioManager();

// Landing screen handler
const landingScreen = document.getElementById('landing-screen');
const landingCta = document.getElementById('landing-cta');

// Animate landing screen elements on load
if (landingScreen) {
  const landingTitle = document.querySelector('.landing-title');
  const landingSubtitle = document.querySelector('.landing-subtitle');
  const landingCtaBtn = document.querySelector('.landing-cta');
  
  // Trigger animations with 1 second delays
  setTimeout(() => {
    if (landingTitle) landingTitle.classList.add('animate');
  }, 1000);
  
  setTimeout(() => {
    if (landingSubtitle) landingSubtitle.classList.add('animate');
  }, 2000);
  
  setTimeout(() => {
    if (landingCtaBtn) landingCtaBtn.classList.add('animate');
  }, 3000);
}

if (landingCta) {
  landingCta.addEventListener('click', () => {
    // Initialize and unmute audio
    audioManager.init();
    audioManager.unmuteAudio();
    
    // Fade out landing screen
    landingScreen.classList.add('fade-out');
    
    // Remove landing screen after fade
    setTimeout(() => {
      landingScreen.remove();
      // Ensure body is ready for Scene 1
      document.body.classList.add('js-ready');
      
      // Play crow sound 1 second after scene 1 starts (store timeout ID)
      audioManager.crowSoundTimeout = setTimeout(() => {
        audioManager.playCrowSound();
        audioManager.crowSoundTimeout = null;
      }, 1000);
    }, 1000);
  });
} else {
  // Fallback if no landing screen exists
  audioManager.init();
}

// ==============================================================================
// DEVELOPMENT TOOL: Keyboard Shortcuts
// ==============================================================================
// Quick scene navigation using number keys 1-5
// Automatically cleans up current scene before jumping
document.addEventListener('keydown', (e) => {
  // Only trigger if no input/textarea is focused
  if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
  
  // Helper function to clean up current scene
  const cleanupCurrentScene = () => {
    const scene = document.getElementById('fog-scene');
    if (!scene) return;
    
    // Remove all bubbles
    const bubbles = scene.querySelectorAll('.bubble');
    bubbles.forEach(b => b.remove());
    
    // Remove scene-specific content divs (use more specific selectors)
    const sceneContents = scene.querySelectorAll('.scene-2, .scene-3-content, .scene-4, .scene-5-content, [class*="scene-"]');
    sceneContents.forEach(s => s.remove());
    
    // Remove any remaining content containers
    const contentDivs = scene.querySelectorAll('div:not(.fog-layer):not(.tree-wrapper):not(.tree-layer)');
    contentDivs.forEach(div => {
      // Keep fog and tree elements, remove everything else
      if (!div.classList.contains('fog-layer') && 
          !div.classList.contains('tree-wrapper') && 
          !div.classList.contains('tree-layer')) {
        div.remove();
      }
    });
    
    // Reset scene classes completely
    scene.className = 'scene';
    scene.classList.add('scene--ready');
    
    // Reset scene background color
    scene.style.backgroundColor = '';
    
    // Remove landing screen if present
    const landing = document.getElementById('landing-screen');
    if (landing) landing.remove();
    
    // Ensure body is ready
    document.body.classList.add('js-ready');
  };
  
  switch(e.key) {
    case '1':
      cleanupCurrentScene();
      // Initialize audio
      if (!audioManager.initialized) {
        audioManager.init();
        audioManager.unmuteAudio();
      }
      // Reload page to get Scene 1 fresh
      location.reload();
      break;
      
    case '2':
      cleanupCurrentScene();
      if (!audioManager.initialized) {
        audioManager.init();
        audioManager.unmuteAudio();
      }
      const testBubble = document.createElement('div');
      testBubble.className = 'bubble';
      openScene2(testBubble);
      break;
      
    case '3':
      cleanupCurrentScene();
      if (!audioManager.initialized) {
        audioManager.init();
        audioManager.unmuteAudio();
      }
      openScene3();
      break;
      
    case '4':
      cleanupCurrentScene();
      if (!audioManager.initialized) {
        audioManager.init();
        audioManager.unmuteAudio();
      }
      openScene4();
      break;
      
    case '5':
      cleanupCurrentScene();
      if (!audioManager.initialized) {
        audioManager.init();
        audioManager.unmuteAudio();
      }
      openScene5();
      break;
      
    case '6':
      cleanupCurrentScene();
      if (!audioManager.initialized) {
        audioManager.init();
        audioManager.unmuteAudio();
      }
      openScene6();
      break;
      
    case '7':
      cleanupCurrentScene();
      if (!audioManager.initialized) {
        audioManager.init();
        audioManager.unmuteAudio();
      }
      openScene7();
      break;
      
    case '8':
      cleanupCurrentScene();
      if (!audioManager.initialized) {
        audioManager.init();
        audioManager.unmuteAudio();
      }
      openScene8();
      break;
      
    case '9':
      cleanupCurrentScene();
      if (!audioManager.initialized) {
        audioManager.init();
        audioManager.unmuteAudio();
      }
      openScene9();
      break;
  }
});

// Fullscreen button handler
const fullscreenBtn = document.getElementById('fullscreen-btn');
if (fullscreenBtn) {
  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen();
    }
  });
}

// Attach expand / takeover handlers to bubbles on the page.
let bubbles = document.querySelectorAll('.bubble');

if (bubbles.length === 0) {
  console.warn('No .bubble elements found on the page');
}

// finalizeExpand removed - expandBubble now handles everything in one smooth flow

// Perform a zoom animation from the clicked bubble into the centered modal
// ==============================================================================
// COMPONENT: Bubble Expansion System
// ==============================================================================
// Handles dynamic sizing, pagination, and content animation for bubble interactions
// Three-phase expansion: size → background → content fade-in
function expandBubble(bubble) {
  if (bubble.classList.contains('expanded')) return;

  const scene = document.getElementById('fog-scene');
  if (!scene) return;

  // Cancel crow sound if it's scheduled (first bubble clicked before crow plays)
  audioManager.cancelCrowSound();

  // Calculate dynamic bubble size based on sentence count (max 5 sentences = 680px)
  const calculateBubbleSize = (sentenceCount) => {
    const baseSentences = 3;
    const baseSize = 520; // Base bubble size for 3 sentences (Scene 1 uses separate 800px + 1.6x scale)
    const maxSentences = 5; // Cap at 5 sentences for size calculation
    const growthPerSentence = 80; // Linear growth: 520 → 600 → 680
    
    // Use actual count or max, whichever is smaller
    const effectiveCount = Math.min(sentenceCount, maxSentences);
    
    if (effectiveCount <= baseSentences) {
      return baseSize;
    }
    
    // Linear growth: 80px per extra sentence
    const extraSentences = effectiveCount - baseSentences;
    const size = baseSize + (extraSentences * growthPerSentence);
    return size;
  };

  // Mark scene as zooming so other bubbles move out
  scene.classList.add('scene--zooming');
  if (typeof pushOtherBubbles === 'function') pushOtherBubbles(bubble);

  // Stop animations on the bubble immediately
  bubble.style.animation = 'none';
  
  // Inject content structure NOW (before expansion starts)
  let content = bubble.querySelector('.bubble-content');
  if (!content) {
    const templateId = bubble.dataset.template || 'bubble-template';
    const tpl = document.getElementById(templateId);
    
    if (tpl && tpl.content) {
      const tplRoot = tpl.content.firstElementChild;
      if (tplRoot) {
        content = tplRoot.cloneNode(true);
        const inner = document.createElement('div');
        inner.className = 'bubble-inner-card';
        // Don't set inline opacity - let CSS handle it
        inner.appendChild(content);
        bubble.appendChild(inner);
      }
    }
  }

  // Count sentences in content to determine bubble size and pagination
  // Re-query from bubble to ensure we get the content after it's in the DOM
  content = bubble.querySelector('.bubble-content');
  const sentences = content ? content.querySelectorAll('.sentence') : [];
  const sentenceCount = sentences.length || 3; // Default to 3 if no sentences found
  const bubbleSize = calculateBubbleSize(sentenceCount);
  
  // Pagination setup: max 5 sentences per page
  const sentencesPerPage = 5;
  const totalPages = Math.ceil(sentenceCount / sentencesPerPage);
  let currentPage = 1;
  
  // Store dynamic size as CSS custom property on the bubble
  bubble.style.setProperty('--dynamic-bubble-size', `${bubbleSize}px`);
  
  // Bubble sizing configured dynamically

  // Calculate adaptive delay between sentences helper function
  const calculateSentenceDelay = (count) => {
    if (count <= 3) return 5000;
    if (count <= 6) return 3000;
    if (count <= 10) return 2000;
    return 1500; // For very long content
  };

  // Function to show sentences for current page
  const showPageSentences = (page, animateImmediately = true) => {
    const startIndex = (page - 1) * sentencesPerPage;
    const endIndex = Math.min(startIndex + sentencesPerPage, sentenceCount);
    
    // Hide all sentences first
    sentences.forEach(s => {
      s.classList.remove('sentence-animate');
      s.style.display = 'none';
    });
    
    // Show sentences for current page (display: inline-block to establish height)
    const pageSentences = Array.from(sentences).slice(startIndex, endIndex);
    pageSentences.forEach(s => s.style.display = 'inline-block');
    
    // Animate with dynamic timing (only if animateImmediately is true)
    if (animateImmediately) {
      const sentenceDelay = calculateSentenceDelay(pageSentences.length);
      pageSentences.forEach((sentence, index) => {
        setTimeout(() => {
          sentence.classList.add('sentence-animate');
        }, index * sentenceDelay);
      });
    }
    
    return pageSentences;
  };
  
  // Wire CTA handler with pagination support
  const cta = bubble.querySelector('#bubble-cta');
  if (cta) {
    // Set initial CTA text
    cta.textContent = totalPages > 1 ? 'Volgende' : 'Pop!';
    
    cta.addEventListener('click', (ev) => {
      ev.stopPropagation();
      
      // Handle pagination if more pages exist
      if (currentPage < totalPages) {
        currentPage++;
        showPageSentences(currentPage);
        
        // Handle audio transitions for beta bubble (ChatGPT)
        if (bubble.classList.contains('bubble-orbit-beta')) {
          if (currentPage === 2) {
            // Stop Chat1 and start Chat2 when moving to page 2
            audioManager.stopChat1Audio();
            audioManager.playChat2Audio();
          }
        }
        
        // Handle audio transitions for tobias bubble (Scene 8)
        if (bubble.classList.contains('bubble-tobias')) {
          if (currentPage === 2) {
            // Stop Tobias1 and start Tobias2 when moving to page 2
            audioManager.stopTobias1Audio();
            audioManager.playTobias2Audio();
          }
        }
        
        // Update CTA text for last page
        if (currentPage === totalPages) {
          cta.textContent = 'Pop!';
        }
        return;
      }
      
      // Play pop sound only when actually popping the bubble
      audioManager.playPopSound();
      
      // Stop intro audio if it's playing (first bubble)
      audioManager.stopIntroAudio();
      
      // Stop Copilot audio if it's playing (alpha bubble)
      audioManager.stopCopilotAudio();
      
      // Stop Chat audio if it's playing (beta bubble)
      audioManager.stopChat1Audio();
      audioManager.stopChat2Audio();
      
      // Stop WatisAI audio if it's playing (gamma bubble)
      audioManager.stopWatIsAIAudio();
      
      // Stop Geneve audio if it's playing (delta bubble)
      audioManager.stopGeneveAudio();
      
      // Stop Paul Blok audio if it's playing (epsilon bubble)
      audioManager.stopPaulBlokAudio();
      
      // Stop Michiel audio if it's playing (zeta bubble)
      audioManager.stopMichielAudio();
      
      // Stop Joey audio if it's playing (eta bubble)
      audioManager.stopJoeyAudio();
      
      // Stop Kathleen audio if it's playing (theta bubble)
      audioManager.stopKathleenAudio();
      
      // Stop Marieke audio if it's playing (iota bubble)
      audioManager.stopMariekeAudio();
      
      // Stop Rron Nushi audio if it's playing (kappa bubble)
      audioManager.stopRronNushiAudio();
      
      // Stop Rawaz audio if it's playing (lambda bubble)
      audioManager.stopRawazAudio();
      
      // Stop Tobias audio if it's playing (tobias bubble)
      audioManager.stopTobias1Audio();
      audioManager.stopTobias2Audio();
      
      if (bubble.dataset.scene2 === 'true') {
        const innerCard = bubble.querySelector('.bubble-inner-card');
        if (innerCard) try { innerCard.remove(); } catch (e) {}
        bubble.classList.remove('expanded');
        if (scene) {
          scene.classList.remove('scene--expanded');
          scene.classList.remove('scene--zoom');
        }
        bubble.style.transition = 'opacity 300ms ease, transform 300ms ease';
        bubble.style.opacity = '0';
        bubble.style.transform = 'translate(-50%, -50%) scale(0.8)';
        setTimeout(() => {
          try { bubble.remove(); } catch (e) {}
          resetOtherBubbles();
          const remaining = document.querySelectorAll('[data-scene2="true"]');
          if (remaining.length === 0) openScene3();
        }, 300);
      } else if (bubble.dataset.scene4 === 'true') {
        const innerCard = bubble.querySelector('.bubble-inner-card');
        if (innerCard) try { innerCard.remove(); } catch (e) {}
        bubble.classList.remove('expanded');
        if (scene) {
          scene.classList.remove('scene--expanded');
          scene.classList.remove('scene--zoom');
        }
        bubble.style.transition = 'opacity 300ms ease, transform 300ms ease';
        bubble.style.opacity = '0';
        bubble.style.transform = 'translate(-50%, -50%) scale(0.8)';
        setTimeout(() => {
          try { bubble.remove(); } catch (e) {}
          resetOtherBubbles();
          setTimeout(() => {
            const remaining = document.querySelectorAll('[data-scene4="true"]');
            if (remaining.length === 0) openScene5();
          }, 50);
        }, 300);
      } else if (bubble.dataset.scene6 === 'true') {
        const innerCard = bubble.querySelector('.bubble-inner-card');
        if (innerCard) try { innerCard.remove(); } catch (e) {}
        bubble.classList.remove('expanded');
        if (scene) {
          scene.classList.remove('scene--expanded');
          scene.classList.remove('scene--zoom');
        }
        bubble.style.transition = 'opacity 300ms ease, transform 300ms ease';
        bubble.style.opacity = '0';
        bubble.style.transform = 'translate(-50%, -50%) scale(0.8)';
        setTimeout(() => {
          try { bubble.remove(); } catch (e) {}
          resetOtherBubbles();
          setTimeout(() => {
            const remaining = document.querySelectorAll('[data-scene6="true"]');
            if (remaining.length === 0) openScene7();
          }, 50);
        }, 300);
      } else if (bubble.dataset.scene8 === 'true') {
        const innerCard = bubble.querySelector('.bubble-inner-card');
        if (innerCard) try { innerCard.remove(); } catch (e) {}
        bubble.classList.remove('expanded');
        if (scene) {
          scene.classList.remove('scene--expanded');
          scene.classList.remove('scene--zoom');
        }
        bubble.style.transition = 'opacity 300ms ease, transform 300ms ease';
        bubble.style.opacity = '0';
        bubble.style.transform = 'translate(-50%, -50%) scale(0.8)';
        setTimeout(() => {
          try { bubble.remove(); } catch (e) {}
          resetOtherBubbles();
          setTimeout(() => {
            const remaining = document.querySelectorAll('[data-scene8="true"]');
            if (remaining.length === 0) openScene9();
          }, 50);
        }, 300);
      } else {
        openScene2(bubble);
      }
    });
  }

  // Add expanded class and prepare for transition
  bubble.classList.add('expanded');
  
  // Mark as dialog for accessibility
  bubble.setAttribute('role', 'dialog');
  bubble.setAttribute('aria-modal', 'true');
  bubble.style.pointerEvents = 'auto';
  
  // Update scene state
  scene.classList.remove('scene--zooming');
  scene.classList.add('scene--expanded');
  scene.classList.add('scene--zoom');

  // Phase 1: Apply transition property FIRST, then change values in next frame
  bubble.classList.add('bubble-size-transition');
  
  requestAnimationFrame(() => {
    // Now apply the actual size/position values - this will smoothly transition
    bubble.classList.add('bubble-size-apply');
  });

  // Phase 1 complete: size transition finishes after 1.2s
  // Phase 2: Start background color fade
  setTimeout(() => {
    // First apply transition property
    bubble.classList.add('bubble-background-transition');
    // Wait 50ms to ensure transition is registered, then apply color values
    setTimeout(() => {
      bubble.classList.add('bubble-background-apply');
    }, 50);
  }, 1200);
  
  // Phase 2 complete: background fade finishes after 1.5s more (1.2s + 1.5s = 2.7s)
  // Phase 3: Show content
  setTimeout(() => {
    console.log('[BUBBLE] Phase 3: Starting content reveal at 2700ms');
    
    // IMPORTANT: Show sentences FIRST (without animation) to establish correct height
    console.log('[BUBBLE] Showing first page of sentences (display only, no animation yet)');
    const pageSentences = showPageSentences(1, false);
    console.log(`[BUBBLE] First page has ${pageSentences.length} sentences`);
    
    // Small delay to let sentences render in DOM, then fade in content container
    setTimeout(() => {
      console.log('[BUBBLE] Adding bubble-show-content class');
      bubble.classList.add('bubble-show-content');
      
      // Start intro audio for first bubble (no scene dataset attributes)
      if (!bubble.dataset.scene2 && !bubble.dataset.scene4 && !bubble.dataset.scene6 && !bubble.dataset.scene8) {
        audioManager.playIntroAudio();
      }
      
      // Start Copilot audio for alpha bubble (scene 2)
      if (bubble.classList.contains('bubble-orbit-alpha')) {
        audioManager.playCopilotAudio();
      }
      
      // Start Chat1 audio for beta bubble (scene 2, page 1)
      if (bubble.classList.contains('bubble-orbit-beta')) {
        audioManager.playChat1Audio();
      }
      
      // Start WatisAI audio for gamma bubble (scene 2)
      if (bubble.classList.contains('bubble-orbit-gamma')) {
        audioManager.playWatIsAIAudio();
      }
      
      // Start Geneve audio for delta bubble (scene 4)
      if (bubble.classList.contains('bubble-delta')) {
        audioManager.playGeneveAudio();
      }
      
      // Start Paul Blok audio for epsilon bubble (scene 4)
      if (bubble.classList.contains('bubble-epsilon')) {
        audioManager.playPaulBlokAudio();
        
        // Add profile bubble for Paul Blok
        const profileBubble = document.createElement('div');
        profileBubble.className = 'profile-bubble';
        bubble.appendChild(profileBubble);
      }
      
      // Start Michiel audio for zeta bubble (scene 4)
      if (bubble.classList.contains('bubble-zeta')) {
        audioManager.playMichielAudio();
        
        // Add profile bubble for Michiel (left)
        const profileBubble = document.createElement('div');
        profileBubble.className = 'profile-bubble';
        profileBubble.style.backgroundImage = "url('assets/img/Michiel.png')";
        bubble.appendChild(profileBubble);
      }
      
      // Start Joey audio for eta bubble (scene 6)
      if (bubble.classList.contains('bubble-eta')) {
        audioManager.playJoeyAudio();
      }
      
      // Start Kathleen audio for theta bubble (scene 6)
      if (bubble.classList.contains('bubble-theta')) {
        audioManager.playKathleenAudio();
      }
      
      // Start Marieke audio for iota bubble (scene 6)
      if (bubble.classList.contains('bubble-iota')) {
        audioManager.playMariekeAudio();
      }
      
      // Start Rron Nushi audio for kappa bubble (scene 6)
      if (bubble.classList.contains('bubble-kappa')) {
        audioManager.playRronNushiAudio();
      }
      
      // Start Rawaz audio for lambda bubble (scene 6)
      if (bubble.classList.contains('bubble-lambda')) {
        audioManager.playRawazAudio();
        
        // Add profile bubble for Rawaz (bottom-left)
        const profileBubble = document.createElement('div');
        profileBubble.className = 'profile-bubble-bottom-left';
        bubble.appendChild(profileBubble);
      }
      
      // Start Tobias1 audio for tobias bubble (scene 8, page 1)
      if (bubble.classList.contains('bubble-tobias')) {
        audioManager.playTobias1Audio();
        
        // Add profile bubble for Tobias (right side)
        const profileBubble = document.createElement('div');
        profileBubble.className = 'profile-bubble-right';
        bubble.appendChild(profileBubble);
      }
      
      // Animate title first
      const title = bubble.querySelector('.bubble-title');
      if (title) {
        console.log('[BUBBLE] Animating title');
        title.classList.add('bubble-title-animate');
      }
      
      // After title animation starts, animate sentences with delay
      const titleAnimationDuration = 1500; // Title takes ~1.5s to fade in
      setTimeout(() => {
        console.log('[BUBBLE] Now animating sentences');
        const sentenceDelay = calculateSentenceDelay(pageSentences.length);
        pageSentences.forEach((sentence, index) => {
          setTimeout(() => {
            sentence.classList.add('sentence-animate');
          }, index * sentenceDelay);
        });
      }, titleAnimationDuration);
    }, 100);
    
    const cta = bubble.querySelector('#bubble-cta');
    if (cta) {
      setTimeout(() => cta.focus(), 200);
    }
  }, 2700);
}

// `collapseBubble` removed: linear flow enforced (no user collapse).
// If you need a programmatic collapse later, reintroduce a concise
// implementation here that cleans up `.bubble-content` and `.bubble-inner-card`.

function attachBubbleHandler(bubble) {
  // Ensure label exists for hiding on expand
  let label = bubble.querySelector('.bubble-label');
  if (!label) {
    const span = document.createElement('span');
    span.className = 'bubble-label';
    span.textContent = bubble.textContent.trim() || 'Bubble';
    bubble.textContent = '';
    bubble.appendChild(span);
  }

  // Special behavior for epsilon bubble - move to corner on mouseenter
  if (bubble.classList.contains('bubble-epsilon')) {
    let moveStep = 0;
    let isTransitioning = false;
    
    bubble.addEventListener('mouseenter', () => {
      if (!bubble.classList.contains('expanded') && !isTransitioning) {
        if (moveStep === 0) {
          // First move: to down-left corner
          moveStep = 1;
          isTransitioning = true;
          bubble.style.animation = 'none';
          bubble.style.transition = 'top 0.6s cubic-bezier(.25,.46,.45,.94), left 0.6s cubic-bezier(.25,.46,.45,.94), transform 0.3s ease';
          bubble.style.top = '85%';
          bubble.style.left = '15%';
          setTimeout(() => {
            isTransitioning = false;
            bubble.style.transition = 'none';
            bubble.style.animation = 'epsilon-wobble 4.5s ease-in-out infinite';
          }, 650); // Wait for 0.6s transition + 50ms buffer
        } else if (moveStep === 1) {
          // Second move: to up-left corner
          moveStep = 2;
          isTransitioning = true;
          bubble.style.animation = 'none';
          bubble.style.transition = 'top 0.6s cubic-bezier(.25,.46,.45,.94), left 0.6s cubic-bezier(.25,.46,.45,.94), transform 0.3s ease';
          bubble.style.top = '15%';
          bubble.style.left = '15%';
          setTimeout(() => {
            isTransitioning = false;
            bubble.style.transition = 'none';
            bubble.style.animation = 'epsilon-wobble 4.5s ease-in-out infinite';
          }, 650);
        } else if (moveStep === 2) {
          // Third move: to center of screen
          moveStep = 3;
          isTransitioning = true;
          bubble.style.animation = 'none';
          bubble.style.transition = 'top 0.6s cubic-bezier(.25,.46,.45,.94), left 0.6s cubic-bezier(.25,.46,.45,.94), transform 0.3s ease';
          bubble.style.top = '50%';
          bubble.style.left = '50%';
          setTimeout(() => {
            isTransitioning = false;
            bubble.style.transition = 'none';
            bubble.style.animation = 'epsilon-wobble 4.5s ease-in-out infinite';
          }, 650);
        }
      }
    });
  }

  bubble.addEventListener('click', (ev) => {
    // Linear flow: once expanded, the bubble does not collapse via click.
    if (bubble.classList.contains('expanded')) {
      // ignore clicks when expanded
      ev.stopPropagation();
      return;
    }
    expandBubble(bubble);
  });
}

// Attach handlers to initially existing bubbles
bubbles.forEach(attachBubbleHandler);

// -----------------------------
// Procedural fog generation + UI binding
// -----------------------------

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

function createFogLayers(backCount = 6, frontCount = 5) {
  const scene = document.getElementById('fog-scene');
  if (!scene) return;

  // Ensure background fog container exists
  let fog = scene.querySelector('.fog');
  if (!fog) {
    fog = document.createElement('div');
    fog.className = 'fog';
    scene.insertBefore(fog, scene.firstChild);
  }

  // If an inlined SVG placeholder is present, prefer it and build layered
  // atmosphere by cloning the SVG multiple times with slight visual offsets.
  // This keeps the designer artwork as the primary atmosphere source.
  const inlineSvgWrapper = fog.querySelector('.fog-svg-placeholder');
  if (inlineSvgWrapper) {
    fog.classList.add('fog--svg');
    inlineSvgWrapper.style.transition = inlineSvgWrapper.style.transition || 'opacity 520ms ease';
    inlineSvgWrapper.style.opacity = inlineSvgWrapper.style.opacity === '' ? '' : '1';

    // Number of layered clones to create. Increase for more depth (costs paint).
    const layerCount = 8;
    const baseHtml = inlineSvgWrapper.innerHTML;

    // Remove the single placeholder; we'll replace it with a set of layered wrappers
    inlineSvgWrapper.remove();

    for (let i = 0; i < layerCount; i++) {
      const layerWrap = document.createElement('div');
      layerWrap.className = 'fog-svg-layer';
      layerWrap.setAttribute('aria-hidden', 'true');
      layerWrap.style.position = 'absolute';
      layerWrap.style.inset = '0';
      layerWrap.style.pointerEvents = 'none';
      layerWrap.style.width = '100%';
      layerWrap.style.height = '100%';

      // Best-effort: rewrite any internal ids inside the SVG to avoid collisions
      // (e.g., defs/filters). We replace id="..." and references like url(#...).
      const suffix = `-layer${i}`;
      let layerHtml = baseHtml;
      const idRegex = /id\s*=\s*"([^"]+)"/g;
      const ids = [];
      let m;
      while ((m = idRegex.exec(baseHtml)) !== null) {
        if (m[1]) ids.push(m[1]);
      }
      const uniqIds = Array.from(new Set(ids));
      uniqIds.forEach(oldId => {
        const newId = oldId + suffix;
        const idDeclRe = new RegExp(`id\\s*=\\s*"${oldId}"`, 'g');
        layerHtml = layerHtml.replace(idDeclRe, `id="${newId}"`);
        const urlRefRe = new RegExp(`url\\(#${oldId}\\)`, 'g');
        layerHtml = layerHtml.replace(urlRefRe, `url(#${newId})`);
        const hashRefRe = new RegExp(`\"#${oldId}\"`, 'g');
        layerHtml = layerHtml.replace(hashRefRe, `"#${newId}"`);
      });

      layerWrap.innerHTML = layerHtml;

      // Variation per layer for opacity/stacking and subtle transform
      const baseOpacity = 0.05 + (i / layerCount) * 0.34;
      const density = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fog-density')) || 1;
      layerWrap.style.opacity = String(baseOpacity * density);
      layerWrap.style.zIndex = String(6 + i);

      const tx = (i - layerCount / 2) * 0.7; // percent
      const ty = (i - layerCount / 2) * -0.45;
      const scl = 1 + i * 0.006;
      layerWrap.style.transform = `translate3d(${tx}%, ${ty}%, 0) scale(${scl})`;
      layerWrap.style.transition = 'transform 900ms cubic-bezier(.2,.8,.2,1), opacity 600ms ease';

      const dur = 70 + i * 7;
      layerWrap.style.animation = `drift ${dur}s linear infinite ${i % 2 ? 'reverse' : 'normal'}`;

      fog.appendChild(layerWrap);
    }

    return;
  }

  // Ensure foreground fog container exists
  let fogFg = scene.querySelector('.fog-foreground');
  if (!fogFg) {
    fogFg = document.createElement('div');
    fogFg.className = 'fog-foreground';
    scene.appendChild(fogFg);
  }

  // Clear existing procedural layers (preserve any markup that isn't ours)
  fog.querySelectorAll('.proc-fog').forEach(n => n.remove());
  fogFg.querySelectorAll('.proc-fog').forEach(n => n.remove());

  const density = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fog-density')) || 1;

  // Build background layers into a fragment first to avoid incremental reflow/paint
  const backFrag = document.createDocumentFragment();
  for (let i = 0; i < backCount; i++) {
    const el = document.createElement('div');
    el.className = 'fog-layer proc-fog';
    const top = `${randomRange(-15, 20)}%`;
    const left = `${randomRange(-30, 20)}%`;
    const width = `${randomRange(110, 170)}%`;
    const height = `${randomRange(100, 140)}%`;
    const base = randomRange(0.06, 0.28);
    el.style.top = top;
    el.style.left = left;
    el.style.width = width;
    el.style.height = height;
    el.dataset.baseOpacity = String(base);
    // start invisible and fade in after append to avoid white pops
    el.style.opacity = '0';
    el.style.filter = `blur(var(--fog-blur))`;
    const dur = randomRange(60, 140).toFixed(0);
    const dir = Math.random() > 0.5 ? 'reverse' : '';
    el.style.animation = `drift ${dur}s linear infinite ${dir}`;
    // give a per-element opacity transition for smooth fade
    el.style.transition = 'opacity 650ms ease';
    backFrag.appendChild(el);
  }
  fog.appendChild(backFrag);

  // Build foreground layers into a fragment as well
  const frontFrag = document.createDocumentFragment();
  for (let i = 0; i < frontCount; i++) {
    const el = document.createElement('div');
    el.className = 'fog-foreground-layer proc-fog';
    const top = `${randomRange(40, 75)}%`;
    const left = `${randomRange(-25, 10)}%`;
    const width = `${randomRange(100, 160)}%`;
    const height = `${randomRange(40, 80)}%`;
    const base = randomRange(0.12, 0.38);
    el.style.top = top;
    el.style.left = left;
    el.style.width = width;
    el.style.height = height;
    el.dataset.baseOpacity = String(base);
    el.style.opacity = '0';
    el.style.filter = `blur(var(--fog-blur))`;
    const dur = randomRange(50, 100).toFixed(0);
    const dir = Math.random() > 0.5 ? 'reverse' : '';
    el.style.animation = `drift ${dur}s linear infinite ${dir}`;
    el.style.transition = 'opacity 650ms ease';
    frontFrag.appendChild(el);
  }
  fogFg.appendChild(frontFrag);

  // Fade the procedural fog into view in the next frame to reduce visual popping
  requestAnimationFrame(() => {
    document.querySelectorAll('.proc-fog').forEach(el => {
      const base = parseFloat(el.dataset.baseOpacity) || 0.15;
      el.style.opacity = String(base * density);
    });
  });
}

function updateFogDensity(value) {
  // value: numeric multiplier
  document.documentElement.style.setProperty('--fog-density', String(value));
  // update procedural layers
  document.querySelectorAll('.proc-fog').forEach(el => {
    const base = parseFloat(el.dataset.baseOpacity) || 0.15;
    el.style.opacity = String(base * value);
  });
}

// wire UI slider
const fogSlider = document.getElementById('fog-density-range');
if (fogSlider) {
  fogSlider.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    updateFogDensity(v);
  });
}

// create an initial amount of fog once DOM is ready to avoid layout flashes
document.addEventListener('DOMContentLoaded', () => {
  // fewer layers initially to reduce work on first paint
  createFogLayers(12, 14);
  // when fog elements are attached, wait for two frames then reveal UI
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.body.classList.add('js-ready');
    // Start Scene 1 ambient audio
    audioManager.playAmbient(1);
  }));
});


// Helper to re-query bubbles (useful after scene changes)
function refreshBubbleList() {
  bubbles = document.querySelectorAll('.bubble');
}

// Move non-clicked bubbles away in directions based on which bubble was clicked.
function pushOtherBubbles(clicked) {
  // Simpler: fade other bubbles out (no directional movement)
  document.querySelectorAll('.bubble').forEach(b => {
    if (b === clicked) return;
    b.style.transition = 'opacity 320ms ease, transform 320ms ease';
    // slightly scale down while fading for a subtle effect
    b.style.transform = 'translate(-50%, -50%) scale(0.92)';
    b.style.opacity = '0';
    b.style.pointerEvents = 'none';
    // pause float animation to avoid visual conflict
    b.style.animation = 'none';
  });
}

function resetOtherBubbles() {
  document.querySelectorAll('.bubble').forEach(b => {
    b.style.transition = '';
    b.style.transform = '';
    b.style.opacity = '';
    b.style.visibility = '';
    b.style.animation = '';
    b.style.pointerEvents = '';
  });
}

// ============================================
// ==============================================================================
// COMPONENT: Scene Transition System
// ==============================================================================
// Configurable transitions between scenes with audio and animation coordination
// Pattern: Configure transition → runSceneTransition() handles execution
// 
// USAGE: Add new transition to TRANSITIONS object, e.g., '3-4', '4-5'
// Structure: { duration, audioFadeOut, audioFadeIn, onStart, onComplete }

const TRANSITIONS = {
  '2-3': {
    duration: 5500, // Total transition duration in ms
    audioFadeOut: 500,
    audioFadeIn: 300,
    onStart: (scene) => {
      // Add transition class to trigger CSS animations
      scene.classList.add('transitioning-2-3');
      scene.classList.remove('scene-2');
      
      // ============================================
      // PHASE 1: OLD TREES EXIT ANIMATION (0-1600ms)
      // ============================================
      // Scene 2: bomen naar buiten schuiven met schaal
      // Linker bomen gaan naar links, rechter bomen gaan naar rechts
      // Selecteer de wrappers direct - niet de tree elementen
      const oldWrappers = scene.querySelectorAll('.tree-wrapper-left-1, .tree-wrapper-left-2, .tree-wrapper-left-3, .tree-wrapper-right-1, .tree-wrapper-right-2, .tree-wrapper-right-3');
      console.log('[2-3] Found old wrappers:', oldWrappers.length, Array.from(oldWrappers).map(w => w.className));
      
      
      oldWrappers.forEach(wrapper => {
        const isLeft = wrapper.classList.contains('tree-wrapper-left-1') || 
                       wrapper.classList.contains('tree-wrapper-left-2') || 
                       wrapper.classList.contains('tree-wrapper-left-3');
        
          // Stop sway animatie op 3 manieren om zeker te zijn:
          // 1. Pauzeer de animatie
          wrapper.style.animationPlayState = 'paused';
          // 2. Verwijder de animatie volledig (reset naar geen animatie)
          wrapper.style.animation = 'none';
          // 3. Force transition voor smooth movement
          wrapper.style.transition = 'transform 4.6s ease-in-out, opacity 2.2s ease-out';        // Linker bomen: translateX(-180vw), Rechter bomen: translateX(180vw)
        const direction = isLeft ? '-180vw' : '180vw';
        
        // Force repaint om animatie te resetten voor transform werkt
        void wrapper.offsetHeight;
        
        wrapper.style.opacity = '0';
        if (isLeft) {
          wrapper.style.transform = `translateX(${direction}) scale(1.2)`;
        } else {
          // Behoud scaleX(-1) voor rechter bomen
          wrapper.style.transform = `translateX(${direction}) scaleX(-1) scale(1.2)`;
        }
      });
      
      // Remove old tree wrappers after exit animation
      setTimeout(() => {
        oldWrappers.forEach(wrapper => {
          try { 
            wrapper.remove();
          } catch (e) {}
        });
      }, 4600);
      
      // ============================================
      // PHASE 2: NEW BROWN TREES ENTER (0-1800ms)
      // ============================================
      // Scene 3: bomen waaieren uit vanuit onder-midden naar hun eindposities
      // Linker bomen starten 40% left, rechter bomen 40% right (symmetrisch)
      setTimeout(() => {
        // Selecteer de wrappers voor positie animatie
        const brownWrappers = scene.querySelectorAll('.tree-wrapper-brown-left-1, .tree-wrapper-brown-left-2, .tree-wrapper-brown-left-3, .tree-wrapper-brown-right-1, .tree-wrapper-brown-right-2, .tree-wrapper-brown-right-3');
        console.log('[2-3] Brown wrappers selected:', brownWrappers.length, Array.from(brownWrappers).map(w => ({ cls: w.className, style: { left: w.style.left, right: w.style.right, bottom: w.style.bottom, opacity: w.style.opacity, transform: w.style.transform } })));
        
        brownWrappers.forEach(wrapper => {
          const isLeft = wrapper.classList.contains('tree-wrapper-brown-left-1') || 
                         wrapper.classList.contains('tree-wrapper-brown-left-2') || 
                         wrapper.classList.contains('tree-wrapper-brown-left-3');
          
          // Stop sway animatie tijdens entrance (net als bij oude bomen)
          wrapper.style.animation = 'none';
          
          // Bereken CSS eindpositie van wrapper
          const computedStyle = window.getComputedStyle(wrapper);
          const finalLeft = computedStyle.left;
          const finalRight = computedStyle.right;
          const finalBottom = computedStyle.bottom;
          console.log('[2-3] Computed final position for', wrapper.className, { finalLeft, finalRight, finalBottom });
          
          // Zet wrapper tijdelijk op startpositie (onder-midden met gap)
          wrapper.style.transition = 'none';
          
          // Symmetrische start: linker vanaf links, rechter vanaf rechts
          if (isLeft) {
            wrapper.style.left = '30%';
            wrapper.style.right = 'auto';
          } else {
            wrapper.style.left = 'auto';
            wrapper.style.right = '30%';  // Symmetrisch: ook 30% maar vanaf rechts
          }
          wrapper.style.bottom = '0';
          
          // Start transform: klein, met scaleX(-1) voor rechter bomen
          const hasScaleX = wrapper.style.transform && wrapper.style.transform.includes('scaleX(-1)');
          wrapper.style.transform = hasScaleX ? 'scaleX(-1) scale(0.3)' : 'scale(0.3)';
          
          // Maak tree zichtbaar
          const tree = wrapper.querySelector('.tree-layer');
          if (tree) {
            tree.style.opacity = '0';
            tree.style.pointerEvents = 'auto';
          }
          
          // Force repaint
          void wrapper.offsetHeight;
          
          // Animeer naar eindpositie
          wrapper.style.transition = 'left 4.8s ease-out, right 4.8s ease-out, bottom 4.8s ease-out, transform 4.8s ease-out';
          
          // Herstel CSS eindpositie
          if (isLeft) {
            wrapper.style.left = finalLeft;
            wrapper.style.right = 'auto';
          } else {
            wrapper.style.left = 'auto';
            wrapper.style.right = finalRight;
          }
          wrapper.style.bottom = finalBottom;
          
          // Herstel eindtransform: behoud scaleX(-1) voor rechter bomen
          const needsScaleX = wrapper.classList.toString().includes('right');
          wrapper.style.transform = needsScaleX ? 'scaleX(-1) scale(1)' : 'scale(1)';
          
          // Fade in tree
          if (tree) {
            tree.style.transition = 'opacity 4.2s ease-out';
            tree.style.opacity = '1';
            console.log('[2-3] Fading in tree for', wrapper.className);
          }
          
          // Herstart sway animatie na entrance (4.8s)
          setTimeout(() => {
            wrapper.style.removeProperty('animation');
          }, 4800);
        });
      }, 0);
      
      // ============================================
      // PHASE 3: FOG OPACITY REDUCTION (0-800ms)
      // ============================================
      // Gradual fog reduction: Scene 2->3 reduces by ~15%
      const fogLayers = scene.querySelectorAll('.fog-layer, .fog-svg-layer, .proc-fog, .fog-foreground-layer');
      console.log('[2-3] Fog layers affected:', fogLayers.length);
      fogLayers.forEach(layer => {
        const currentOpacity = parseFloat(getComputedStyle(layer).getPropertyValue('--fog-opacity')) || parseFloat(window.getComputedStyle(layer).opacity) || 0.2;
        const newOpacity = currentOpacity * 0.85; // Reduce by 15%
        layer.style.transition = 'opacity 800ms ease';
        layer.style.setProperty('--fog-opacity', String(newOpacity));
      });
    },
    onComplete: (scene) => {
      // Remove transition class and set final scene state
      scene.classList.remove('transitioning-2-3');
      scene.classList.add('scene-3');
    }
  },
  '4-5': {
    duration: 5500,
    audioFadeOut: 500,
    audioFadeIn: 300,
    onStart: (scene) => {
      scene.classList.add('transitioning-4-5');
      scene.classList.remove('scene-4');
      
      // Exit BROWN trees
      const brownWrappers = scene.querySelectorAll('.tree-wrapper-brown-left-1, .tree-wrapper-brown-left-2, .tree-wrapper-brown-left-3, .tree-wrapper-brown-right-1, .tree-wrapper-brown-right-2, .tree-wrapper-brown-right-3');
      console.log('[4-5] Brown wrappers to exit:', brownWrappers.length, Array.from(brownWrappers).map(w => w.className));
      brownWrappers.forEach(wrapper => {
        const isLeft = wrapper.classList.toString().includes('left');
        wrapper.style.animation = 'none';
        wrapper.style.transition = 'transform 4.6s ease-in-out';
        const direction = isLeft ? '-180vw' : '180vw';
        void wrapper.offsetHeight;
        wrapper.style.transform = isLeft ? `translateX(${direction}) scale(1.2)` : `translateX(${direction}) scaleX(-1) scale(1.2)`;
      });
      setTimeout(() => { brownWrappers.forEach(w => { try { w.remove(); } catch(e){} }); }, 4600);

      // Enter LEAVES trees (same choreography as 2-3 entrance)
      setTimeout(() => {
        const leavesWrappers = scene.querySelectorAll('.tree-wrapper-leaves-left-1, .tree-wrapper-leaves-left-2, .tree-wrapper-leaves-left-3, .tree-wrapper-leaves-right-1, .tree-wrapper-leaves-right-2, .tree-wrapper-leaves-right-3');
        console.log('[4-5] Leaves wrappers selected:', leavesWrappers.length, Array.from(leavesWrappers).map(w => ({ cls: w.className, style: { left: w.style.left, right: w.style.right, bottom: w.style.bottom, opacity: w.style.opacity, transform: w.style.transform } })));
        leavesWrappers.forEach(wrapper => {
          const isLeft = wrapper.classList.toString().includes('left');
          wrapper.style.animation = 'none';
          const cs = window.getComputedStyle(wrapper);
          const finalLeft = cs.left; const finalRight = cs.right; const finalBottom = cs.bottom;
          wrapper.style.transition = 'none';
          if (isLeft) { wrapper.style.left = '30%'; wrapper.style.right = 'auto'; } else { wrapper.style.left = 'auto'; wrapper.style.right = '30%'; }
          wrapper.style.bottom = '0';
          const hasScaleX = wrapper.style.transform && wrapper.style.transform.includes('scaleX(-1)');
          wrapper.style.transform = hasScaleX ? 'scaleX(-1) scale(0.3)' : 'scale(0.3)';
          const tree = wrapper.querySelector('.tree-layer');
          if (tree) { tree.style.opacity = '0'; tree.style.pointerEvents = 'auto'; }
          void wrapper.offsetHeight;
          wrapper.style.transition = 'left 4.8s ease-out, right 4.8s ease-out, bottom 4.8s ease-out, transform 4.8s ease-out';
          if (isLeft) { wrapper.style.left = finalLeft; wrapper.style.right = 'auto'; } else { wrapper.style.left = 'auto'; wrapper.style.right = finalRight; }
          wrapper.style.bottom = finalBottom;
          const needsScaleX = wrapper.classList.toString().includes('right');
          wrapper.style.transform = needsScaleX ? 'scaleX(-1) scale(1)' : 'scale(1)';
          if (tree) { tree.style.transition = 'opacity 4.2s ease-out'; tree.style.opacity = '1'; }
          setTimeout(() => { wrapper.style.removeProperty('animation'); }, 4800);
        });
      }, 0);
      
      // Gradual fog reduction: Scene 4->5 reduces by ~15%
      const fogLayers = scene.querySelectorAll('.fog-layer, .fog-svg-layer, .proc-fog, .fog-foreground-layer');
      console.log('[4-5] Fog layers affected:', fogLayers.length);
      fogLayers.forEach(layer => {
        const currentOpacity = parseFloat(getComputedStyle(layer).getPropertyValue('--fog-opacity')) || parseFloat(window.getComputedStyle(layer).opacity) || 0.2;
        const newOpacity = currentOpacity * 0.85; // Reduce by 15%
        layer.style.transition = 'opacity 1000ms ease';
        layer.style.setProperty('--fog-opacity', String(newOpacity));
      });
      
      // Background lightens
      scene.style.backgroundColor = '#156570';
    },
    onComplete: (scene) => {
      scene.classList.remove('transitioning-4-5');
      scene.classList.add('scene-5');
    }
  },
  '6-7': {
    duration: 5500,
    audioFadeOut: 500,
    audioFadeIn: 300,
    onStart: (scene) => {
      scene.classList.add('transitioning-6-7');
      scene.classList.remove('scene-6');
      // Exit LEAVES trees
      const leavesWrappers = scene.querySelectorAll('.tree-wrapper-leaves-left-1, .tree-wrapper-leaves-left-2, .tree-wrapper-leaves-left-3, .tree-wrapper-leaves-right-1, .tree-wrapper-leaves-right-2, .tree-wrapper-leaves-right-3');
      leavesWrappers.forEach(wrapper => {
        const isLeft = wrapper.classList.toString().includes('left');
        wrapper.style.animation = 'none';
        wrapper.style.transition = 'transform 4.6s ease-in-out';
        const direction = isLeft ? '-180vw' : '180vw';
        void wrapper.offsetHeight;
        wrapper.style.transform = isLeft ? `translateX(${direction}) scale(1.2)` : `translateX(${direction}) scaleX(-1) scale(1.2)`;
      });
      setTimeout(() => { leavesWrappers.forEach(w => { try { w.remove(); } catch(e){} }); }, 4600);

      // Enter CHERRIES trees
      setTimeout(() => {
        const cherriesWrappers = scene.querySelectorAll('.tree-wrapper-cherries-left-1, .tree-wrapper-cherries-left-2, .tree-wrapper-cherries-left-3, .tree-wrapper-cherries-right-1, .tree-wrapper-cherries-right-2, .tree-wrapper-cherries-right-3');
        cherriesWrappers.forEach(wrapper => {
          const isLeft = wrapper.classList.toString().includes('left');
          wrapper.style.animation = 'none';
          const cs = window.getComputedStyle(wrapper);
          const finalLeft = cs.left; const finalRight = cs.right; const finalBottom = cs.bottom;
          wrapper.style.transition = 'none';
          if (isLeft) { wrapper.style.left = '30%'; wrapper.style.right = 'auto'; } else { wrapper.style.left = 'auto'; wrapper.style.right = '30%'; }
          wrapper.style.bottom = '0';
          const hasScaleX = wrapper.style.transform && wrapper.style.transform.includes('scaleX(-1)');
          wrapper.style.transform = hasScaleX ? 'scaleX(-1) scale(0.3)' : 'scale(0.3)';
          const tree = wrapper.querySelector('.tree-layer');
          if (tree) { tree.style.opacity = '0'; tree.style.pointerEvents = 'auto'; }
          void wrapper.offsetHeight;
          wrapper.style.transition = 'left 4.8s ease-out, right 4.8s ease-out, bottom 4.8s ease-out, transform 4.8s ease-out';
          if (isLeft) { wrapper.style.left = finalLeft; wrapper.style.right = 'auto'; } else { wrapper.style.left = 'auto'; wrapper.style.right = finalRight; }
          wrapper.style.bottom = finalBottom;
          const needsScaleX = wrapper.classList.toString().includes('right');
          wrapper.style.transform = needsScaleX ? 'scaleX(-1) scale(1)' : 'scale(1)';
          if (tree) { tree.style.transition = 'opacity 4.2s ease-out'; tree.style.opacity = '1'; }
          setTimeout(() => { wrapper.style.removeProperty('animation'); }, 4800);
        });
      }, 0);

      // Gradual fog reduction: Scene 6->7 reduces by ~20%
      const fogLayers = scene.querySelectorAll('.fog-layer, .fog-svg-layer, .proc-fog, .fog-foreground-layer');
      fogLayers.forEach(layer => {
        const currentOpacity = parseFloat(getComputedStyle(layer).getPropertyValue('--fog-opacity')) || parseFloat(window.getComputedStyle(layer).opacity) || 0.2;
        const newOpacity = currentOpacity * 0.80; // Reduce by 20%
        layer.style.transition = 'opacity 1200ms ease';
        layer.style.setProperty('--fog-opacity', String(newOpacity));
      });
      
      // Background lightens
      scene.style.backgroundColor = '#1e7c8a';
    },
    onComplete: (scene) => {
      scene.classList.remove('transitioning-6-7');
      scene.classList.add('scene-7');
    }
  },
  '8-9': {
    duration: 6000,
    audioFadeOut: 800,
    audioFadeIn: 500,
    onStart: (scene) => {
      scene.classList.add('transitioning-8-9');
      scene.classList.remove('scene-8');
      
      // Final fog removal: Scene 8->9 completely fades out remaining fog
      const fogLayers = scene.querySelectorAll('.fog-layer, .fog-svg-layer, .proc-fog, .fog-foreground-layer');
      const allTrees = scene.querySelectorAll('[class*="tree-wrapper"]');
      
      fogLayers.forEach(layer => {
        layer.style.transition = 'opacity 3000ms ease';
        layer.style.setProperty('--fog-opacity', '0');
      });
      
      // Apply transitions first, then in next frame apply opacity/transform so it animates
      allTrees.forEach(tree => {
        tree.style.animation = 'none';
        tree.style.transition = 'transform 4500ms ease-in-out, opacity 2500ms ease';
        const inner = tree.querySelector('.tree-layer');
        if (inner) {
          inner.style.transition = 'opacity 2500ms ease';
        }
      });

      requestAnimationFrame(() => {
        allTrees.forEach(tree => {
          const isLeft = tree.classList.toString().includes('left');
          const direction = isLeft ? '-150vw' : '150vw';
          tree.style.opacity = '0';
          tree.style.transform = isLeft ? `translateX(${direction}) scale(0.8)` : `translateX(${direction}) scaleX(-1) scale(0.8)`;
          const inner = tree.querySelector('.tree-layer');
          if (inner) {
            inner.style.opacity = '0';
          }
        });
      });
      
      // Background to light sky blue
      scene.style.backgroundColor = '#4da8b8';
      
      setTimeout(() => {
        fogLayers.forEach(layer => {
          try { layer.remove(); } catch (e) {}
        });
        allTrees.forEach(tree => {
          try { tree.remove(); } catch (e) {}
        });
      }, 5000);

      // Audio: transition ambient to birds for Scene 9
      audioManager.switchToScene9Ambient(1500, 1500);
    },
    onComplete: (scene) => {
      scene.classList.remove('transitioning-8-9');
      scene.classList.add('scene-9');
    }
  }
};



/**
 * Execute a scene transition
 * @param {string} transitionKey - Key from TRANSITIONS config (e.g., '2-3')
 */
function runSceneTransition(transitionKey) {
  const scene = document.getElementById('fog-scene');
  if (!scene) return console.warn('Scene container not found');
  
  const config = TRANSITIONS[transitionKey];
  if (!config) return console.warn(`Transition ${transitionKey} not configured`);
  
  // Play transition audio: 2-3, 4-5, 6-7 use Steps.wav looping
  if (transitionKey === '2-3' || transitionKey === '4-5' || transitionKey === '6-7') {
    audioManager.playTransition('Steps.wav', true, 0.6);
    // Fade ambient to 50% for Scene 2-3 transition
    audioManager.fadeAmbientToLevel(0.5, config.audioFadeOut);
  } else if (transitionKey !== '3-4') {
    audioManager.playTransition();
  }
  
  // Execute transition start logic
  if (config.onStart) config.onStart(scene);
  
  // Adjust ambient volumes for new scene and fade back up
  const targetScene = parseInt(transitionKey.split('-')[1]);
  setTimeout(() => {
    audioManager.playAmbient(targetScene); // Adjusts volumes for new scene
    if (transitionKey === '2-3' || transitionKey === '4-5' || transitionKey === '6-7') {
      // Fade back up to full volume after transition
      audioManager.fadeInAmbient(800);
    }
  }, config.audioFadeIn);
  
  // Execute completion logic after transition duration
  setTimeout(() => {
    if (config.onComplete) config.onComplete(scene);
    // Stop transition audio when scene transition completes
    if (transitionKey === '2-3' || transitionKey === '4-5' || transitionKey === '6-7') {
      audioManager.stopTransition();
    }
  }, config.duration);
}

// Load Scene 3 after all Scene 2 bubbles are popped
function openScene3() {
  const scene = document.getElementById('fog-scene');
  if (!scene) return console.warn('Scene container not found');

  // Remove any remaining Scene 2 elements
  scene.querySelectorAll('[data-scene2="true"]').forEach(b => b.remove());

  // Run the Scene 2 → 3 transition
  runSceneTransition('2-3');

  // Wait for transition to complete before adding content
  setTimeout(() => {
    // Prefer cloning the HTML template `#scene-3-template` if present
    const tpl = document.getElementById('scene-3-template');
    if (tpl && tpl.content) {
      const frag = tpl.content.cloneNode(true);
      scene.appendChild(frag);
      
      // Wire CTA to proceed to Scene 4
      const scene3Cta = document.getElementById('scene3-cta');
      if (scene3Cta) {
        scene3Cta.addEventListener('click', () => {
          const scene3Content = document.querySelector('.scene-3-content');
          if (scene3Content) {
            scene3Content.style.transition = 'opacity 300ms ease';
            scene3Content.style.opacity = '0';
            setTimeout(() => {
              try { scene3Content.remove(); } catch (e) {}
              openScene4();
            }, 300);
          } else {
            openScene4();
          }
        }, { once: true });
      }
      return;
    }

    // Fallback: display a simple Scene 3 message with CTA
    const scene3Content = document.createElement('div');
    scene3Content.style.position = 'fixed';
    scene3Content.style.top = '50%';
    scene3Content.style.left = '50%';
    scene3Content.style.transform = 'translate(-50%, -50%)';
    scene3Content.style.textAlign = 'center';
    scene3Content.style.color = '#F0EAD6';
    scene3Content.style.zIndex = '100';
    scene3Content.innerHTML = '<h1>Scene 3</h1><p>All bubbles popped!</p><button id="scene3-cta" style="margin-top: 20px; padding: 10px 20px; background: #2B6DF6; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">Continue</button>';
    scene.appendChild(scene3Content);
    
    // Wire CTA to proceed to Scene 4
    const scene3Cta = document.getElementById('scene3-cta');
    if (scene3Cta) {
      scene3Cta.addEventListener('click', () => {
        scene3Content.style.transition = 'opacity 300ms ease';
        scene3Content.style.opacity = '0';
        setTimeout(() => {
          try { scene3Content.remove(); } catch (e) {}
          openScene4();
        }, 300);
      }, { once: true });
    }
  }, TRANSITIONS['2-3'].duration);
}

// Load Scene 5 (Titel Segment 2) after all Scene 4 bubbles are popped
function openScene5() {
  const scene = document.getElementById('fog-scene');
  if (!scene) return console.warn('Scene container not found');

  // Remove any remaining Scene 4 elements
  scene.querySelectorAll('[data-scene4="true"]').forEach(b => b.remove());

  // Run the Scene 4 → 5 transition
  runSceneTransition('4-5');

  // Wait for transition to complete before adding content
  setTimeout(() => {
    const tpl = document.getElementById('scene-5-template');
    if (tpl && tpl.content) {
      const frag = tpl.content.cloneNode(true);
      scene.appendChild(frag);
      
      // Wire CTA to proceed to Scene 6
      const scene5Cta = document.getElementById('scene5-cta');
      if (scene5Cta) {
        scene5Cta.addEventListener('click', () => {
          const scene5Content = document.querySelector('.scene-5-content');
          if (scene5Content) {
            scene5Content.style.transition = 'opacity 300ms ease';
            scene5Content.style.opacity = '0';
            setTimeout(() => {
              try { scene5Content.remove(); } catch (e) {}
              openScene6();
            }, 300);
          } else {
            openScene6();
          }
        }, { once: true });
      }
    }
  }, TRANSITIONS['4-5'].duration);
}

// Load Scene 6 with five unique bubbles
function openScene6() {
  const scene = document.getElementById('fog-scene');
  if (!scene) return console.warn('Scene container not found');

  // Update ambient audio for Scene 6
  audioManager.playAmbient(5); // Reuse Scene 5 audio config
  audioManager.unmuteAudio();
  setTimeout(() => {
    audioManager.fadeInAmbient(600);
  }, 100);

  const tpl = document.getElementById('scene-6-template');
  if (tpl && tpl.content) {
    const frag = tpl.content.cloneNode(true);
    const newBubbles = Array.from(frag.querySelectorAll('.bubble'));
    newBubbles.forEach(b => b.dataset.scene6 = 'true');
    scene.appendChild(frag);

    // Animate each bubble with unique entrance
    newBubbles.forEach((b, i) => {
      b.style.transition = 'transform 600ms cubic-bezier(.34,1.56,.64,1), opacity 450ms ease, top 600ms cubic-bezier(.34,1.56,.64,1), left 600ms cubic-bezier(.34,1.56,.64,1)';
      
      setTimeout(() => {
        b.style.transform = 'translate(-50%, -50%) scale(1)';
        b.style.opacity = '1';
        console.log('[SCENE6] Bubble positioned:', b.className, 'top:', b.style.top, 'left:', b.style.left, 'transform:', b.style.transform);
        
        // Start specific animation after entrance
        setTimeout(() => {
          b.style.transition = 'none';
          if (b.classList.contains('bubble-eta')) {
            b.style.animation = 'eta-rectangular-step 16s linear infinite';
            console.log('[SCENE6] Joey animation started');
          } else if (b.classList.contains('bubble-theta')) {
            b.style.animation = 'theta-float-orbit 10s ease-in-out infinite';
            console.log('[SCENE6] Kathleen animation started');
          } else if (b.classList.contains('bubble-iota')) {
            b.style.animation = 'iota-rise-from-bottom 14s ease-in-out infinite';
            console.log('[SCENE6] Marieke animation started - should rise from bottom');
          } else if (b.classList.contains('bubble-kappa')) {
            b.style.animation = 'kappa-large-wobble 10s ease-in-out infinite';
            console.log('[SCENE6] Rron animation started');
          } else if (b.classList.contains('bubble-lambda')) {
            b.style.animation = 'lambda-bounce-squeeze 8s ease-in-out infinite';
            console.log('[SCENE6] Rawaz animation started');
          }
        }, 650);
      }, 100 + (i * 120));
    });

    refreshBubbleList();
    newBubbles.forEach(attachBubbleHandler);
  }
}

// Load Scene 7 (Titel Segment 3) after all Scene 6 bubbles are popped
function openScene7() {
  const scene = document.getElementById('fog-scene');
  if (!scene) return console.warn('Scene container not found');

  // Remove any remaining Scene 6 elements
  scene.querySelectorAll('[data-scene6="true"]').forEach(b => b.remove());

  // Run the Scene 6 → 7 transition
  runSceneTransition('6-7');

  // Wait for transition to complete before adding content
  setTimeout(() => {
    const tpl = document.getElementById('scene-7-template');
    if (tpl && tpl.content) {
      const frag = tpl.content.cloneNode(true);
      scene.appendChild(frag);
      
      // Wire CTA to proceed to Scene 8
      const scene7Cta = document.getElementById('scene7-cta');
      if (scene7Cta) {
        scene7Cta.addEventListener('click', () => {
          const scene7Content = document.querySelector('.scene-7-content');
          if (scene7Content) {
            scene7Content.style.transition = 'opacity 300ms ease';
            scene7Content.style.opacity = '0';
            setTimeout(() => {
              try { scene7Content.remove(); } catch (e) {}
              openScene8();
            }, 300);
          } else {
            openScene8();
          }
        }, { once: true });
      }
    }
  }, TRANSITIONS['6-7'].duration);
}

// Load Scene 8 with three creative bubbles
function openScene8() {
  const scene = document.getElementById('fog-scene');
  if (!scene) return console.warn('Scene container not found');

  // Update ambient audio for Scene 8
  audioManager.playAmbient(5); // Reuse Scene 5 audio config
  audioManager.unmuteAudio();
  setTimeout(() => {
    audioManager.fadeInAmbient(600);
  }, 100);

  const tpl = document.getElementById('scene-8-template');
  if (tpl && tpl.content) {
    const frag = tpl.content.cloneNode(true);
    const newBubbles = Array.from(frag.querySelectorAll('.bubble'));
    newBubbles.forEach(b => b.dataset.scene8 = 'true');
    scene.appendChild(frag);

    // Start blossom rain for Scene 8
    if (window.BlossomRain && typeof window.BlossomRain.initBlossomRainForScene8 === 'function') {
      window.BlossomRain.initBlossomRainForScene8();
    } else {
      console.log('[BLOSSOM] Module not available');
    }

    // Animate each bubble with creative entrance
    newBubbles.forEach((b, i) => {
      if (b.classList.contains('bubble-tobias')) {
        // Tobias bubble: dramatic spiral entrance
        b.style.transition = 'transform 1200ms cubic-bezier(.68,-0.55,.27,1.55), opacity 800ms ease';
        setTimeout(() => {
          b.style.transform = 'translate(-50%, -50%) scale(1) rotate(0deg)';
          b.style.opacity = '1';
          setTimeout(() => {
            b.style.transition = 'none';
            b.style.animation = 'tobias-spiral-bounce 14s ease-in-out infinite';
          }, 1250);
        }, 200);
      } else if (b.classList.contains('bubble-mu')) {
        b.style.transition = 'transform 900ms cubic-bezier(.68,-0.55,.27,1.55), opacity 600ms ease';
        setTimeout(() => {
          b.style.transform = 'translate(-50%, -50%) scale(1) rotate(0deg)';
          b.style.opacity = '1';
          setTimeout(() => {
            b.style.transition = 'none';
            b.style.animation = 'mu-spin-shift 20s ease-in-out infinite';
          }, 950);
        }, 150);
      } else if (b.classList.contains('bubble-nu')) {
        b.style.transition = 'transform 700ms cubic-bezier(.34,1.56,.64,1), opacity 500ms ease';
        setTimeout(() => {
          b.style.transform = 'translate(-50%, -50%) scale(1)';
          b.style.opacity = '1';
          setTimeout(() => {
            b.style.transition = 'none';
            b.style.animation = 'nu-wave-complex 24s ease-in-out infinite';
          }, 750);
        }, 350);
      } else if (b.classList.contains('bubble-xi')) {
        b.style.transition = 'transform 800ms cubic-bezier(.175,.885,.32,1.275), opacity 550ms ease';
        setTimeout(() => {
          b.style.transform = 'translate(-50%, -50%)';
          b.style.opacity = '1';
          setTimeout(() => {
            b.style.transition = 'none';
            b.style.animation = 'xi-elastic 15s ease-in-out infinite';
          }, 850);
        }, 550);
      }
    });

    refreshBubbleList();
    newBubbles.forEach(attachBubbleHandler);
  }
}

// Load Scene 9 (Eindscherm) after all Scene 8 bubbles are popped
function openScene9() {
  const scene = document.getElementById('fog-scene');
  if (!scene) return console.warn('Scene container not found');

  // Remove any remaining Scene 8 elements
  scene.querySelectorAll('[data-scene8="true"]').forEach(b => b.remove());

  // Stop and cleanup blossom rain when leaving Scene 8
  if (window.BlossomRain && typeof window.BlossomRain.destroyBlossomRain === 'function') {
    window.BlossomRain.destroyBlossomRain();
  }

  // Run the Scene 8 → 9 transition (clears fog and trees)
  runSceneTransition('8-9');

  // Wait for transition to complete before adding content
  setTimeout(() => {
    const tpl = document.getElementById('scene-9-template');
    if (tpl && tpl.content) {
      const frag = tpl.content.cloneNode(true);
      scene.appendChild(frag);
      
      // Add click handler to restart button
      const restartBtn = document.getElementById('restart-button');
      if (restartBtn) {
        restartBtn.addEventListener('click', () => {
          console.log('[RESTART] Reloading page to restart experience');
          location.reload();
        });
      }
    }
  }, TRANSITIONS['8-9'].duration);
}

// Load Scene 4 with three bubbles (gamma, epsilon, zeta)
function openScene4() {
  const scene = document.getElementById('fog-scene');
  if (!scene) return console.warn('Scene container not found');

  // Start Scene 4 ambient audio immediately, unmute, and fade in
  audioManager.playAmbient(4);
  audioManager.unmuteAudio();
  setTimeout(() => {
    audioManager.fadeInAmbient(600);
  }, 100);

  // Prefer cloning the HTML template `#scene-4-template` if present
  const tpl = document.getElementById('scene-4-template');
  if (tpl && tpl.content) {
    const frag = tpl.content.cloneNode(true);
    // Mark these as Scene 4 bubbles
    const newBubbles = Array.from(frag.querySelectorAll('.bubble'));
    newBubbles.forEach(b => b.dataset.scene4 = 'true');
    scene.appendChild(frag);

    // Animate bubbles in with different transitions
    newBubbles.forEach((b, i) => {
      if (b.classList.contains('bubble-delta')) {
        // Delta: bouncy entrance from top with scale
        b.style.animation = 'none'; // Disable animations during entrance
        b.style.transition = 'top 650ms cubic-bezier(.34,1.56,.64,1), transform 650ms cubic-bezier(.34,1.56,.64,1), opacity 400ms ease';
        setTimeout(() => {
          b.style.top = '35%';
          b.style.transform = 'translate(-50%, -50%) scale(1)';
          b.style.opacity = '1';
          // After entrance, start chase animation
          setTimeout(() => {
            b.style.transition = 'none';
            b.style.animation = 'delta-chase 18s cubic-bezier(.4,.05,.55,.95) infinite';
          }, 700);
        }, 100);
      } else if (b.classList.contains('bubble-epsilon')) {
        // Epsilon: smooth slide from bottom with fade
        b.style.animation = 'none'; // Disable animations during entrance
        b.style.transition = 'top 550ms cubic-bezier(.25,.46,.45,.94), transform 550ms cubic-bezier(.25,.46,.45,.94), opacity 500ms ease';
        setTimeout(() => {
          b.style.top = '65%';
          b.style.transform = 'translate(-50%, -50%) scale(1)';
          b.style.opacity = '1';
          // After entrance, start eccentric wobble
          setTimeout(() => {
            b.style.transition = 'none';
            b.style.animation = 'epsilon-wobble 4.5s ease-in-out infinite';
          }, 600);
        }, 350);
      } else if (b.classList.contains('bubble-zeta')) {
        // Zeta: spiral entrance from center
        b.style.animation = 'none';
        b.style.transition = 'transform 700ms cubic-bezier(.34,1.56,.64,1), opacity 450ms ease';
        setTimeout(() => {
          b.style.transform = 'translate(-50%, -50%) scale(1)';
          b.style.opacity = '1';
          setTimeout(() => {
            b.style.transition = 'none';
            b.style.animation = 'zeta-spiral 12s ease-in-out infinite';
          }, 750);
        }, 200);
      } else {
        // Fallback for any other bubbles
        b.style.transition = 'transform 450ms cubic-bezier(.2,.8,.2,1), opacity 350ms ease';
        setTimeout(() => {
          b.style.transform = 'translate(-50%, -50%) scale(1)';
          b.style.opacity = '1';
        }, 80 * i + 50);
      }
    });

    // Attach handlers to the new bubbles
    refreshBubbleList();
    newBubbles.forEach(attachBubbleHandler);
    return;
  }

  // Fallback: create three bubbles procedurally
  const specs = [
    { label: 'Delta', top: '35%', left: '25%', template: 'bubble-content-delta', className: 'bubble-delta' },
    { label: 'Epsilon', top: '65%', left: '70%', template: 'bubble-content-epsilon', className: 'bubble-epsilon' },
    { label: 'Zeta', top: '45%', left: '55%', template: 'bubble-content-zeta', className: 'bubble-zeta' }
  ];

  specs.forEach((s, i) => {
    const b = document.createElement('div');
    b.className = 'bubble';
    if (s.className) b.classList.add(s.className);
    b.dataset.scene4 = 'true'; // Mark as Scene 4 bubble
    b.dataset.template = s.template; // Assign unique content template
    b.style.left = s.left;
    const lbl = document.createElement('span');
    lbl.className = 'bubble-label';
    lbl.textContent = s.label;
    b.appendChild(lbl);
    
    // Different initial states and transitions
    if (s.label === 'Delta') {
      b.style.animation = 'none'; // Disable animations during entrance
      b.style.top = '-20%';
      b.style.transform = 'translate(-50%, -50%) scale(0.5)';
      b.style.opacity = '0';
      scene.appendChild(b);
      setTimeout(() => {
        b.style.transition = 'top 650ms cubic-bezier(.34,1.56,.64,1), transform 650ms cubic-bezier(.34,1.56,.64,1), opacity 400ms ease';
        b.style.top = s.top;
        b.style.transform = 'translate(-50%, -50%) scale(1)';
        b.style.opacity = '1';
        // After entrance, start chase animation
        setTimeout(() => {
          b.style.transition = 'none';
          b.style.animation = 'delta-chase 18s cubic-bezier(.4,.05,.55,.95) infinite';
        }, 700);
      }, 100);
    } else if (s.label === 'Epsilon') {
      b.style.animation = 'none'; // Disable animations during entrance
      b.style.top = '120%';
      b.style.transform = 'translate(-50%, -50%) scale(0.8)';
      b.style.opacity = '0';
      scene.appendChild(b);
      setTimeout(() => {
        b.style.transition = 'top 550ms cubic-bezier(.25,.46,.45,.94), transform 550ms cubic-bezier(.25,.46,.45,.94), opacity 500ms ease';
        b.style.top = s.top;
        b.style.transform = 'translate(-50%, -50%) scale(1)';
        b.style.opacity = '1';
        // After entrance, start eccentric wobble
        setTimeout(() => {
          b.style.transition = 'none';
          b.style.animation = 'epsilon-wobble 4.5s ease-in-out infinite';
        }, 600);
      }, 350);
    } else if (s.label === 'Zeta') {
      b.style.animation = 'none';
      b.style.top = s.top;
      b.style.transform = 'translate(-50%, 50%) scale(0.6)';
      b.style.opacity = '0';
      scene.appendChild(b);
      setTimeout(() => {
        b.style.transition = 'transform 700ms cubic-bezier(.34,1.56,.64,1), opacity 450ms ease';
        b.style.transform = 'translate(-50%, -50%) scale(1)';
        b.style.opacity = '1';
        setTimeout(() => {
          b.style.transition = 'none';
          b.style.animation = 'zeta-spiral 12s ease-in-out infinite';
        }, 750);
      }, 200);
    } else {
      b.style.top = s.top;
      b.style.transform = 'translate(-50%, -50%) scale(0.7)';
      b.style.opacity = '0';
      scene.appendChild(b);
      setTimeout(() => {
        b.style.transition = 'transform 450ms cubic-bezier(.2,.8,.2,1), opacity 350ms ease';
        b.style.transform = 'translate(-50%, -50%) scale(1)';
        b.style.opacity = '1';
      }, 80 * i + 50);
    }
  });

  refreshBubbleList();
  document.querySelectorAll('[data-scene4="true"]').forEach(attachBubbleHandler);
}

// Create Scene 2 with three bubbles
function openScene2(triggerBubble) {
  const scene = document.getElementById('fog-scene');
  if (!scene) return console.warn('Scene container not found');

  // spawn the three new bubbles (delayed until pop animation finishes)
  const spawnScene2 = () => {
    // spawnScene2 invoked
    // Remove existing bubbles but preserve other scene elements (fog, overlays)
    const oldBubbles = scene.querySelectorAll('.bubble');
    oldBubbles.forEach(b => b.remove());
    
    // Mark scene as Scene 2
    scene.classList.add('scene-2');

    // Prefer cloning the HTML template `#scene-2-template` if present.
    const tpl = document.getElementById('scene-2-template');
    if (tpl && tpl.content) {
      const frag = tpl.content.cloneNode(true);
      // collect bubbles from the fragment so we can animate them with a stagger
      const newBubbles = Array.from(frag.querySelectorAll('.bubble'));
      
      // Mark these as Scene 2 bubbles so CTA handler knows to remove them
      newBubbles.forEach(b => b.dataset.scene2 = 'true');

      // append the fragment to the scene
      scene.appendChild(frag);

      // animate each new bubble with a small stagger (matches previous timing)
      newBubbles.forEach((b, i) => {
        // ensure starting state (template includes scaled/hidden start, but enforce)
        b.style.transition = 'transform 450ms cubic-bezier(.2,.8,.2,1), opacity 350ms ease';
        
        // small delay so transitions look staggered
        setTimeout(() => {
          b.style.transform = 'translate(-50%, -50%) scale(1)';
          b.style.opacity = '1';
        }, 80 * i + 50);
      });

      // attach handlers to the new bubbles
      refreshBubbleList();
      newBubbles.forEach(attachBubbleHandler);
      return;
    }

    // Fallback: if template missing, recreate procedurally (previous behavior)
    const specs = [
      { label: 'Alpha', top: '30%', left: '28%' },
      { label: 'Beta', top: '52%', left: '72%' },
      { label: 'Gamma', top: '72%', left: '42%' }
    ];

    specs.forEach((s, i) => {
      const b = document.createElement('div');
      b.className = 'bubble';
      b.dataset.scene2 = 'true'; // Mark as Scene 2 bubble
      b.style.top = s.top;
      b.style.left = s.left;
      const lbl = document.createElement('span');
      lbl.className = 'bubble-label';
      lbl.textContent = s.label;
      b.appendChild(lbl);
      b.style.transform = 'translate(-50%, -50%) scale(0.7)';
      b.style.opacity = '0';
      scene.appendChild(b);
      setTimeout(() => {
        b.style.transition = 'transform 450ms cubic-bezier(.2,.8,.2,1), opacity 350ms ease';
        b.style.transform = 'translate(-50%, -50%) scale(1)';
        b.style.opacity = '1';
      }, 80 * i + 50);
    });

    refreshBubbleList();
    document.querySelectorAll('.bubble').forEach(attachBubbleHandler);
  };

  if (triggerBubble) {
    // Play transition swoosh effect
    audioManager.playTransition();
    
    // Fade out Scene 1 ambient and prepare to play Scene 2 ambient
    audioManager.fadeOutAmbient(500);
    
    // remove takeover fog-zoom so background returns to idle while scene transition happens
    scene.classList.remove('scene--zoom');

    // To ensure the pop animation is visible even though the expanded bubble
    // had takeover styles, clone the bubble and animate the clone from center.
    try {
      const clone = triggerBubble.cloneNode(true);
      // Ensure clone has only the classes we want for popping
      clone.className = 'bubble pop';
      // Position clone centered in viewport
      clone.style.position = 'fixed';
      clone.style.top = '50%';
      clone.style.left = '50%';
      clone.style.transform = 'translate(-50%, -50%) scale(1)';
      clone.style.width = '140px';
      clone.style.height = '140px';
      clone.style.borderRadius = '50%';
      clone.style.zIndex = '9999';
      // remove any inner content so the pop looks like the bubble itself
      const innerContent = clone.querySelector('.bubble-content');
      if (innerContent) innerContent.remove();
      const closeBtn = clone.querySelector('.bubble-close');
      if (closeBtn) closeBtn.remove();

      scene.appendChild(clone);

      // remove the expanded element from DOM immediately
      try { triggerBubble.remove(); } catch (e) {}

      clone.addEventListener('animationend', () => {
        try { clone.remove(); } catch (e) {}
        spawnScene2();
        // Wait for fadeOut to complete (500ms) before starting new audio
        setTimeout(() => {
          audioManager.playAmbient(2);
          // Unmute immediately after creating new audio layers
          audioManager.unmuteAudio();
          setTimeout(() => {
            audioManager.fadeInAmbient(600);
          }, 100);
        }, 550);
      }, { once: true });
      // fallback: if animationend doesn't fire for any reason, spawn after 450ms
      setTimeout(() => {
        if (document.body.contains(clone)) {
          try { clone.remove(); } catch (e) {}
          spawnScene2();
          // Wait for fadeOut to complete before starting new audio
          setTimeout(() => {
            audioManager.playAmbient(2);
            // Unmute immediately after creating new audio layers
            audioManager.unmuteAudio();
            setTimeout(() => {
              audioManager.fadeInAmbient(600);
            }, 100);
          }, 550);
        }
      }, 450);
    } catch (err) {
      // Fallback: remove the trigger and spawn immediately
      try { triggerBubble.remove(); } catch (e) {}
      spawnScene2();
    }
  } else {
    spawnScene2();
  }
}
