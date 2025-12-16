/**
 * Voice Feedback Collection Module
 * Collects niche experience data for ML training
 */

const CATALYST_API = 'https://audio-cleanup-service-30038743990.development.catalystappsail.eu/server/voice-feedback';

const NICHE_OPTIONS = [
    { value: 'audiobooks', label: 'Audiobook Narration', icon: '📚' },
    { value: 'commercials', label: 'Commercial Ads', icon: '📺' },
    { value: 'documentary', label: 'Documentary', icon: '🎬' },
    { value: 'elearning', label: 'E-Learning', icon: '🎓' },
    { value: 'gaming', label: 'Gaming/Animation', icon: '🎮' },
    { value: 'podcasts', label: 'Podcast Hosting', icon: '🎙️' },
    { value: 'corporate', label: 'Corporate Training', icon: '💼' },
    { value: 'character', label: 'Character Voices', icon: '🎭' }
];

/**
 * Generate feedback UI HTML
 */
function generateFeedbackUI(voiceType) {
    return `
        <!-- Niche Experience Feedback -->
        <div class="bg-gray-50 rounded-lg p-6 mt-6" id="feedback-section">
            <details class="cursor-pointer">
                <summary class="text-center font-semibold text-gray-700 hover:text-purple-600 transition-all">
                    📊 Help Us Research Voice Patterns (click to expand)
                </summary>
                <div class="mt-6">
                    <p class="text-gray-600 text-center mb-4">
                        Which of these niches have you worked in or plan to pursue?<br>
                        <span class="text-sm">(Select all that apply - this helps us improve the analyzer)</span>
                    </p>

                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        ${NICHE_OPTIONS.map(niche => `
                            <label class="flex items-center gap-2 p-3 border-2 border-gray-200 rounded-lg hover:border-purple-400 cursor-pointer transition-all">
                                <input type="checkbox" name="niche" value="${niche.value}" class="w-4 h-4">
                                <span class="text-sm">${niche.icon} ${niche.label}</span>
                            </label>
                        `).join('')}
                    </div>

                    <div class="mb-4">
                        <label class="block text-sm text-gray-600 mb-2">Experience level:</label>
                        <select id="experience-level" class="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-400 focus:outline-none">
                            <option value="beginner">Beginner (just starting)</option>
                            <option value="intermediate">1-3 years</option>
                            <option value="advanced">3+ years</option>
                            <option value="not_specified">Prefer not to say</option>
                        </select>
                    </div>

                    <button onclick="submitNicheFeedback('${voiceType}')" class="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-all">
                        Submit Feedback
                    </button>

                    <p class="text-xs text-gray-500 text-center mt-3">
                        Your feedback helps us train our AI to better serve aspiring voice actors
                    </p>
                </div>
            </details>
        </div>
    `;
}

/**
 * Submit niche feedback to backend
 */
async function submitNicheFeedback(predictedType) {
    // Get selected niches
    const selectedNiches = Array.from(
        document.querySelectorAll('input[name="niche"]:checked')
    ).map(cb => cb.value);

    if (selectedNiches.length === 0) {
        alert('Please select at least one niche you\'re interested in.');
        return;
    }

    // Get experience level
    const experienceLevel = document.getElementById('experience-level').value;

    // Prepare feedback data
    const feedbackData = {
        predicted_type: predictedType,
        actual_niches: selectedNiches,
        experience_level: experienceLevel,
        features: lastAnalyzedFeatures, // From voice-analyzer.js
        timestamp: new Date().toISOString()
    };

    // Show loading state
    const feedbackSection = document.getElementById('feedback-section');
    const originalContent = feedbackSection.innerHTML;
    feedbackSection.innerHTML = `
        <div class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent"></div>
            <p class="text-gray-600 mt-3">Submitting feedback...</p>
        </div>
    `;

    try {
        // Send to Catalyst backend
        const response = await fetch(CATALYST_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(feedbackData)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        // Track in Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'voice_niche_feedback', {
                predicted_type: predictedType,
                niche_count: selectedNiches.length,
                experience_level: experienceLevel
            });
        }

        // Show success message
        feedbackSection.innerHTML = `
            <div class="text-center py-8 bg-green-50 rounded-lg">
                <i class="fas fa-check-circle text-6xl text-green-600 mb-4"></i>
                <h3 class="text-2xl font-bold text-gray-900 mb-2">Thank You!</h3>
                <p class="text-gray-600 mb-3">Your feedback helps us improve the analyzer for everyone.</p>
                <p class="text-sm text-purple-600">
                    We'll use this data to train our AI to better recognize voices like yours.
                </p>
            </div>
        `;

    } catch (error) {
        console.error('Failed to submit feedback:', error);

        // Show error (but don't disrupt UX too much)
        feedbackSection.innerHTML = originalContent;
        alert('Unable to submit feedback right now. Your experience still helps us improve!');

        // Track error in Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'voice_feedback_error', {
                error: error.message
            });
        }
    }
}
