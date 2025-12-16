/**
 * Voice Type Analyzer
 * Analyzes voice recordings to determine voice acting type
 */

let mediaRecorder;
let audioChunks = [];
let recordingTimer;
let secondsLeft = 30;
let audioContext;
let analyser;
let dataArray;
let animationId;

// Voice type profiles
const voiceTypes = {
    storyteller: {
        name: "The Storyteller",
        icon: "📚",
        description: "Your voice has a warm, engaging quality that draws listeners in. You have natural pacing and a conversational tone that makes people want to keep listening.",
        strengths: ["Warm tone", "Natural pacing", "Engaging delivery", "Emotional connection"],
        bestFor: ["Audiobook Narration", "Podcast Hosting", "Children's Stories", "Memoir Reading"],
        tips: "Focus on audiobook narration and long-form content. Your natural storytelling ability shines in fiction and non-fiction alike.",
        cta: "Ready to start recording audiobooks? Professional audio cleanup ensures your recordings meet ACX standards."
    },
    authority: {
        name: "The Authority",
        icon: "🎯",
        description: "You have a commanding presence and gravitas that demands attention. Your voice carries weight and credibility, perfect for serious content.",
        strengths: ["Deep resonance", "Measured pace", "Authoritative tone", "Clear articulation"],
        bestFor: ["Documentary Narration", "Corporate Training", "News Reading", "Political Content"],
        tips: "Pursue documentary work and corporate narration. Your voice adds credibility to serious, informative content.",
        cta: "Documentary-grade audio requires broadcast standards. Get your recordings professionally cleaned for €15/min."
    },
    energizer: {
        name: "The Energizer",
        icon: "⚡",
        description: "Your voice is bright, dynamic, and full of energy! You bring excitement and enthusiasm that's perfect for upbeat content.",
        strengths: ["High energy", "Fast-paced", "Expressive", "Enthusiastic delivery"],
        bestFor: ["Radio Commercials", "Product Ads", "Gaming Content", "Social Media Videos"],
        tips: "Commercial voice work is your sweet spot. Practice 15-30 second spots and build your demo reel with energetic reads.",
        cta: "Commercial voice over requires pristine audio. Clean up your demo reel for just €12 per audition."
    },
    educator: {
        name: "The Educator",
        icon: "🎓",
        description: "You have a clear, patient, and approachable voice that helps people learn. Your measured delivery makes complex topics feel accessible.",
        strengths: ["Clear articulation", "Patient pacing", "Approachable tone", "Consistent delivery"],
        bestFor: ["E-Learning Courses", "Tutorial Videos", "Educational Content", "Training Materials"],
        tips: "E-learning is booming and needs voices like yours. Platforms like Udemy and Coursera need quality narration.",
        cta: "E-learning platforms have strict audio requirements. Ensure your courses meet Udemy/Coursera standards with professional cleanup."
    },
    versatile: {
        name: "The Versatile Pro",
        icon: "🎭",
        description: "You're the Swiss Army knife of voice acting! Your balanced vocal qualities allow you to adapt to almost any style or genre.",
        strengths: ["Adaptable range", "Balanced tone", "Good control", "Multi-genre capability"],
        bestFor: ["Character Work", "Multiple Roles", "Diverse Projects", "Any Genre"],
        tips: "Your versatility is your superpower. Build a diverse demo reel showcasing different styles - commercial, narration, character work.",
        cta: "Versatile voice actors need consistent audio quality across all styles. Professional cleanup ensures every recording shines."
    },
    character: {
        name: "The Character Artist",
        icon: "🎪",
        description: "You have exceptional dynamic range and expressiveness! Your voice can transform into different characters and emotions with ease.",
        strengths: ["Wide dynamic range", "Expressive", "Character variety", "Emotional depth"],
        bestFor: ["Animation", "Video Games", "Character Voices", "Dramatic Readings"],
        tips: "Animation and gaming need your skills. Create a character demo reel showing your range - hero, villain, creature, comic relief.",
        cta: "Character voices demand clean audio to hear every nuance. Get your character demos professionally cleaned."
    }
};

function startAnalysis() {
    document.getElementById('screen-start').classList.remove('active');
    document.getElementById('screen-recording').classList.add('active');
    document.getElementById('step1').classList.remove('active');
    document.getElementById('step2').classList.add('active');

    // Initialize waveform
    initializeWaveform();

    // Request microphone access
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            setupAudioContext(stream);
        })
        .catch(error => {
            alert('Please allow microphone access to continue');
            console.error('Error accessing microphone:', error);
        });
}

function initializeWaveform() {
    const waveform = document.getElementById('waveform');
    waveform.innerHTML = '';

    // Create 20 waveform bars
    for (let i = 0; i < 20; i++) {
        const bar = document.createElement('div');
        bar.className = 'waveform-bar';
        bar.style.height = '10px';
        waveform.appendChild(bar);
    }
}

function setupAudioContext(stream) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    source.connect(analyser);
    analyser.fftSize = 256;

    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = event => {
        audioChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
        analyzeRecording();
    };
}

function toggleRecording() {
    if (!mediaRecorder) {
        alert('Microphone not ready. Please try again.');
        return;
    }

    if (mediaRecorder.state === 'inactive') {
        startRecording();
    } else {
        stopRecording();
    }
}

function startRecording() {
    audioChunks = [];
    mediaRecorder.start();

    document.getElementById('recordBtn').classList.add('recording-pulse');
    document.getElementById('recordBtnText').textContent = 'Recording...';
    document.getElementById('recordingStatus').textContent = 'Speak naturally and clearly';

    // Start timer
    secondsLeft = 30;
    recordingTimer = setInterval(() => {
        secondsLeft--;
        const mins = Math.floor(secondsLeft / 60);
        const secs = secondsLeft % 60;
        document.getElementById('timer').textContent =
            `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        if (secondsLeft <= 0) {
            stopRecording();
        }
    }, 1000);

    // Start waveform animation
    animateWaveform();
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        clearInterval(recordingTimer);
        cancelAnimationFrame(animationId);

        document.getElementById('recordBtn').classList.remove('recording-pulse');
        document.getElementById('recordBtnText').textContent = 'Recording Complete';
        document.getElementById('recordingStatus').textContent = 'Analyzing your voice...';
    }
}

function animateWaveform() {
    if (!analyser) return;

    analyser.getByteFrequencyData(dataArray);

    const bars = document.querySelectorAll('.waveform-bar');
    const step = Math.floor(dataArray.length / bars.length);

    bars.forEach((bar, i) => {
        const value = dataArray[i * step];
        const height = (value / 255) * 50 + 10; // 10px to 60px
        bar.style.height = height + 'px';
    });

    animationId = requestAnimationFrame(animateWaveform);
}

function analyzeRecording() {
    // Show analyzing screen
    document.getElementById('screen-recording').classList.remove('active');
    document.getElementById('screen-analyzing').classList.add('active');
    document.getElementById('step2').classList.remove('active');
    document.getElementById('step3').classList.add('active');

    // Create audio blob
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    // Perform analysis
    audio.addEventListener('loadedmetadata', () => {
        const duration = audio.duration;

        // Simple analysis (we'll use the audio data we collected)
        const analysis = performVoiceAnalysis(dataArray, duration);

        // Simulate processing time for better UX
        setTimeout(() => {
            showResults(analysis);
        }, 3000);
    });
}

function performVoiceAnalysis(frequencyData, duration) {
    // Calculate basic metrics
    const avgFrequency = frequencyData.reduce((a, b) => a + b) / frequencyData.length;
    const maxFrequency = Math.max(...frequencyData);
    const variance = calculateVariance(frequencyData);

    // Estimate pitch (simplified)
    let pitchCategory;
    if (avgFrequency < 80) {
        pitchCategory = 'low';
    } else if (avgFrequency < 120) {
        pitchCategory = 'medium';
    } else {
        pitchCategory = 'high';
    }

    // Estimate pace (30 second script has ~50 words)
    const estimatedWords = 50;
    const wordsPerMinute = (estimatedWords / duration) * 60;
    let paceCategory;
    if (wordsPerMinute < 130) {
        paceCategory = 'slow';
    } else if (wordsPerMinute < 170) {
        paceCategory = 'medium';
    } else {
        paceCategory = 'fast';
    }

    // Estimate dynamic range
    const dynamicRange = (maxFrequency - Math.min(...frequencyData)) / maxFrequency;
    let rangeCategory;
    if (dynamicRange > 0.7) {
        rangeCategory = 'wide';
    } else if (dynamicRange > 0.4) {
        rangeCategory = 'medium';
    } else {
        rangeCategory = 'narrow';
    }

    // Determine voice type based on characteristics
    return classifyVoiceType(pitchCategory, paceCategory, rangeCategory, variance);
}

function calculateVariance(data) {
    const mean = data.reduce((a, b) => a + b) / data.length;
    const squaredDiffs = data.map(x => Math.pow(x - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b) / data.length);
}

function classifyVoiceType(pitch, pace, range, variance) {
    // Rule-based classification
    if (pitch === 'low' && pace === 'slow') {
        return 'authority';
    } else if (pitch === 'high' && pace === 'fast') {
        return 'energizer';
    } else if (range === 'wide' && variance > 30) {
        return 'character';
    } else if (pace === 'medium' && pitch === 'medium') {
        return 'educator';
    } else if (variance < 25 && range === 'medium') {
        return 'storyteller';
    } else {
        return 'versatile';
    }
}

function showResults(voiceType) {
    const profile = voiceTypes[voiceType];

    const resultsHTML = `
        <div class="bg-white rounded-xl shadow-lg p-8 mb-6">
            <div class="text-center mb-8">
                <div class="text-8xl mb-4">${profile.icon}</div>
                <h2 class="text-4xl font-bold text-gray-900 mb-2">You're ${profile.name}!</h2>
                <p class="text-xl text-gray-600 max-w-2xl mx-auto">${profile.description}</p>
            </div>

            <div class="grid md:grid-cols-2 gap-6 mb-8">
                <div class="bg-green-50 rounded-lg p-6">
                    <h3 class="font-bold text-xl mb-4 text-green-800">
                        <i class="fas fa-star mr-2"></i>Your Strengths
                    </h3>
                    <ul class="space-y-2">
                        ${profile.strengths.map(s => `<li class="flex items-center gap-2"><i class="fas fa-check text-green-600"></i><span>${s}</span></li>`).join('')}
                    </ul>
                </div>

                <div class="bg-blue-50 rounded-lg p-6">
                    <h3 class="font-bold text-xl mb-4 text-blue-800">
                        <i class="fas fa-briefcase mr-2"></i>Best Niches For You
                    </h3>
                    <ul class="space-y-2">
                        ${profile.bestFor.map(n => `<li class="flex items-center gap-2"><i class="fas fa-arrow-right text-blue-600"></i><span>${n}</span></li>`).join('')}
                    </ul>
                </div>
            </div>

            <div class="bg-yellow-50 rounded-lg p-6 mb-8">
                <h3 class="font-bold text-xl mb-3 text-yellow-800">
                    <i class="fas fa-lightbulb mr-2"></i>Expert Tip
                </h3>
                <p class="text-gray-700">${profile.tips}</p>
            </div>

            <div class="bg-gradient-to-r from-red-600 to-red-700 rounded-lg p-6 text-white mb-6">
                <h3 class="font-bold text-2xl mb-3">Ready to Start Your Voice Acting Journey?</h3>
                <p class="mb-4">${profile.cta}</p>
                <div class="flex flex-wrap gap-4">
                    <a href="audio-cleanup.html" class="bg-white text-red-600 px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition-all inline-block">
                        Professional Audio Cleanup →
                    </a>
                    <a href="blog.html" class="bg-red-800 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-900 transition-all inline-block">
                        Read Voice Acting Guides
                    </a>
                </div>
            </div>

            <div class="text-center border-t pt-6">
                <p class="text-gray-600 mb-4">Share your voice type:</p>
                <div class="flex gap-3 justify-center">
                    <button onclick="shareResults('${voiceType}')" class="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-all">
                        <i class="fab fa-twitter mr-2"></i>Share
                    </button>
                    <button onclick="location.reload()" class="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-all">
                        <i class="fas fa-redo mr-2"></i>Try Again
                    </button>
                </div>
            </div>
        </div>

        <!-- Email Capture -->
        <div class="bg-gray-100 rounded-xl p-8 text-center">
            <h3 class="text-2xl font-bold mb-3">Want More Voice Acting Tips?</h3>
            <p class="text-gray-600 mb-6">Get our free guide: "10 Steps to Launch Your Voice Acting Career"</p>
            <form onsubmit="captureEmail(event)" class="max-w-md mx-auto flex gap-3">
                <input type="email" required placeholder="your@email.com"
                       class="flex-1 px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-red-600 focus:outline-none">
                <button type="submit" class="bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 transition-all">
                    Get Guide
                </button>
            </form>
        </div>
    `;

    document.getElementById('screen-analyzing').classList.remove('active');
    document.getElementById('screen-results').classList.add('active');
    document.getElementById('screen-results').innerHTML = resultsHTML;

    // Track in Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', 'voice_type_result', {
            'voice_type': voiceType
        });
    }
}

function shareResults(voiceType) {
    const profile = voiceTypes[voiceType];
    const text = `I just discovered I'm ${profile.name} ${profile.icon}! Find out your voice acting type: https://olavoices.com/voice-type-analyzer`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank');
}

function captureEmail(event) {
    event.preventDefault();
    const email = event.target.querySelector('input[type="email"]').value;

    // Track in Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', 'email_capture', {
            'method': 'voice_analyzer'
        });
    }

    // You can add backend integration here to store the email
    alert('Thanks! Check your email for the guide (you can implement email integration later)');
    event.target.reset();
}
