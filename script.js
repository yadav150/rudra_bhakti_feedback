/* ============================================================
   RUDRA BHAKTI — USER FEEDBACK WIZARD
   Phase 1A : dynamic reel loading + local submission
   Phase 2 : swap submitFeedback() body with Firebase write
   ============================================================ */

(function () {
    'use strict';

    /* ============================================================
       DYNAMIC REEL LOADER
       Reads ?reel=RB001 from URL, looks up saved reels.
       Falls back to default reel if not found.
       ============================================================ */
    const REELS_KEY = 'rrb_reels';

    function getSavedReels() {
        try {
            return JSON.parse(localStorage.getItem(REELS_KEY) || '[]');
        } catch (e) {
            return [];
        }
    }

    function getActiveReel() {
        const params = new URLSearchParams(window.location.search);
        const id = (params.get('reel') || params.get('id') || '').trim().toUpperCase();
        if (!id) return null;
        return getSavedReels().find((r) => r.id === id) || null;
    }

    const activeReel = getActiveReel() || {
        id: 'RB001',
        title: 'Shiva & Parvati — Eternal Love',
        url: '',
        thumbnail: ''
    };

    function applyReelToPage() {
        const titleEl = document.getElementById('reelTitle');
        const codeEl = document.getElementById('reelCode');
        const thumbEl = document.getElementById('reelThumb');

        if (titleEl && activeReel.title) titleEl.textContent = activeReel.title;
        if (codeEl) codeEl.textContent = 'RUDRA • ' + activeReel.id;

        if (thumbEl && activeReel.thumbnail) {
            thumbEl.innerHTML = '<img src="' + activeReel.thumbnail + '" alt="" />';
        }
    }

    /* ===== STATE ===== */
    let currentQuestion = 1;
    const totalQuestions = 5;
    const answers = {};

    /* ===== ELEMENTS ===== */
    const progressNumber = document.getElementById('progressNumber');
    const progressFill = document.getElementById('progressFill');
    const backBtn = document.getElementById('backBtn');
    const nextBtn = document.getElementById('nextBtn');
    const questionCard = document.getElementById('questionCard');
    const success = document.getElementById('success');
    const successMessage = document.getElementById('successMessage');
    const messageField = document.getElementById('message');
    const shareBtn = document.getElementById('shareFacebook');
    const nav = document.querySelector('.navigation');
    const progressArea = document.querySelector('.progress-area');

    /* ============================================================
       OPTIONS
       ============================================================ */
    document.querySelectorAll('.option').forEach((option) => {
        option.addEventListener('click', () => {
            const group = option.dataset.group;
            document
                .querySelectorAll(`.option[data-group="${group}"]`)
                .forEach((item) => item.classList.remove('selected'));
            option.classList.add('selected');
            answers[group] = option.textContent.replace(/\s+/g, ' ').trim();
        });
    });

    /* ============================================================
       RATING
       ============================================================ */
    document.querySelectorAll('.rate').forEach((rate) => {
        rate.addEventListener('click', () => {
            document.querySelectorAll('.rate').forEach((item) => item.classList.remove('selected'));
            rate.classList.add('selected');
            answers.rating = rate.textContent.trim();
        });
    });

    /* ============================================================
       NAVIGATION
       ============================================================ */
    function showQuestion(number) {
        document.querySelectorAll('.question-screen').forEach((screen) => {
            screen.classList.remove('active');
        });

        const target = document.querySelector(`.question-screen[data-question="${number}"]`);
        if (target) target.classList.add('active');

        progressNumber.textContent = number + ' / ' + totalQuestions;
        progressFill.style.width = ((number / totalQuestions) * 100) + '%';
        backBtn.disabled = number === 1;
        nextBtn.textContent = number === totalQuestions ? 'Submit Feedback' : 'Continue';

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function nextQuestion() {
        if (currentQuestion === 1 && !answers.feeling) {
            alert('Please select how this Reel made you feel.');
            return;
        }
        if (currentQuestion === totalQuestions) {
            submitFeedback();
            return;
        }
        currentQuestion++;
        showQuestion(currentQuestion);
    }

    function previousQuestion() {
        if (currentQuestion <= 1) return;
        currentQuestion--;
        showQuestion(currentQuestion);
    }

    backBtn.addEventListener('click', previousQuestion);
    nextBtn.addEventListener('click', nextQuestion);

    /* ============================================================
       HINDI TTS
       ============================================================ */
    document.querySelectorAll('.voice').forEach((button) => {
        button.addEventListener('click', () => {
            speakHindi(button, button.dataset.hindi || '');
        });
    });

    function speakHindi(button, text) {
        if (!text) return;
        if (!('speechSynthesis' in window)) {
            alert('Hindi voice is not supported on this device.');
            return;
        }

        window.speechSynthesis.cancel();

        document.querySelectorAll('.voice').forEach((btn) => btn.classList.remove('playing'));

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'hi-IN';
        utterance.rate = 0.9;
        utterance.pitch = 1;

        button.classList.add('playing');
        utterance.onend = () => button.classList.remove('playing');
        window.speechSynthesis.speak(utterance);
    }

    /* ============================================================
       SUBMIT — SERVICE PLACEHOLDER
       Phase 2 : replace body with Firebase write
       ============================================================ */
    async function submitFeedback() {
        const feedback = {
            contentId: activeReel.id,
            reelId: activeReel.id,
            reelTitle: activeReel.title,
            reelUrl: activeReel.url || null,
            feeling: answers.feeling || null,
            wouldWatchMore: answers.more || null,
            connectedWith: answers.liked || null,
            rating: answers.rating || null,
            message: (messageField.value || '').trim(),
            submittedAt: new Date().toISOString()
        };

        try {
            const list = JSON.parse(localStorage.getItem('rrb_feedback') || '[]');
            list.push({ id: 'local_' + Date.now(), ...feedback });
            localStorage.setItem('rrb_feedback', JSON.stringify(list));
        } catch (e) {
            // ignore storage errors
        }

        console.log('Feedback ready:', feedback);

        await new Promise((r) => setTimeout(r, 500));

        showSuccess(feedback);
    }

    /* ============================================================
       SUCCESS
       ============================================================ */
    function showSuccess(feedback) {
        let msg = 'Your feedback has been received. Your feelings help Rudra Bhakti understand what truly resonates with you.';

        if (feedback.feeling === 'Peaceful') {
            msg = "We're glad this Reel brought you a sense of peace. Your feedback helps us create more moments like this.";
        } else if (feedback.feeling === 'Emotional') {
            msg = 'Thank you for sharing that emotion with us. Your response helps us create more meaningful devotional moments.';
        } else if (feedback.feeling === 'Devotional') {
            msg = 'Thank you for sharing your devotional feeling. It helps us understand what connects with our community.';
        } else if (feedback.feeling === 'Inspired') {
            msg = 'It means a lot that this Reel inspired you. Your feedback guides what we create next.';
        } else if (feedback.feeling === 'Calm') {
            msg = 'We are happy this Reel brought you calm. Your thoughts help us shape future content.';
        } else if (feedback.feeling === 'Deeply moved') {
            msg = 'Thank you for sharing that you were deeply moved. Your response means more than you know.';
        }

        successMessage.textContent = msg;
        questionCard.style.display = 'none';
        nav.style.display = 'none';
        progressArea.style.display = 'none';
        success.hidden = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /* ============================================================
       FACEBOOK SHARE
       ============================================================ */
    shareBtn.addEventListener('click', () => {
        const shareUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href);
        window.open(shareUrl, '_blank', 'width=650,height=550');
    });

    /* ===== INIT ===== */
    applyReelToPage();
    showQuestion(1);
})();
