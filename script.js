// --- DYNAMIC CONFIGURATION ---
// Changed: SAKI_KEY now starts empty and is set via the entry gate every session
let SAKI_KEY = "";

// Function to handle the Key Gate (No localStorage)
window.enterSaki = function() {
    const input = document.getElementById('key-input').value.trim();
    if (input.startsWith("gsk_")) {
        SAKI_KEY = input;
        window.SAKI_KEY = input; // Keep it accessible globally
        document.getElementById('key-gate').style.display = 'none';
        document.getElementById('top-nav').classList.remove('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        console.log("Saki is online for this session.");
    } else {
        alert("Sir, that does not look like a valid Groq key.");
    }
};

// Check on load (Always show gate now because we don't save the key)
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('key-gate').style.display = 'flex';
});

// --- THE MEMORY BANK ---
let chatHistory = [
    {
        role: "system",
        content: `Your name is Saki. You are Muhammad's AI assistant.

                SMART FORMATTING RULES:
                - Use formatting ONLY when it improves readability
                - Do NOT overuse Markdown

                WHEN TO USE FORMATTING:
                - Use **bold** only for important keywords, warnings, or key points
                - Use headings (#, ##, ###) only for structured explanations or long answers
                - Use bullet points only when listing multiple items

                CODE RULES:
                - If the user asks for code, ALWAYS provide properly formatted code blocks using triple backticks.

                BEHAVIOR RULE:
                - Keep responses natural, helpful, and human-like.
                - If the answer is simple, respond normally without excessive formatting.
                `
    }
];

// --- ADVANCED VOICE ENGINE ---
let availableVoices = [];
const loadVoices = () => {
    availableVoices = window.speechSynthesis.getVoices();
};
window.speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

window.speak = function(text) {
    if (!text) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    const isArabic = /[\u0600-\u06FF]/.test(text);
    const lowText = text.toLowerCase();
    let langCode = 'en-GB';

    if (isArabic) langCode = 'ar-SA';
    else if (lowText.includes("ciao")) langCode = 'it-IT';
    else if (lowText.includes("hola")) langCode = 'es-ES';
    else if (lowText.includes("hallo")) langCode = 'de-DE';
    else if (lowText.includes("bonjour")) langCode = 'fr-FR';

    utterance.lang = langCode;

    const bestVoice = availableVoices.find(v => v.lang.startsWith(langCode.split('-')[0]) && (v.name.includes('Natural') || v.name.includes('Neural'))) ||
                      availableVoices.find(v => v.lang.startsWith(langCode.split('-')[0]) && v.name.includes('Google')) ||
                      availableVoices.find(v => v.lang.startsWith(langCode.split('-')[0]));

    if (bestVoice) utterance.voice = bestVoice;
    window.speechSynthesis.speak(utterance);
};

// --- NAVIGATION ---
window.switchTab = (tabId, element) => {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.add('hidden-screen');
        s.classList.remove('active-screen');
    });
    document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));

    const target = document.getElementById(tabId);
    if(target) {
        target.classList.remove('hidden-screen');
        target.classList.add('active-screen');
    }
    if(element) element.classList.add('active');
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.add('sidebar-hidden');
    }

    if(tabId !== 'talk-tab') stopVoiceSystem();
};

window.openModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('hidden');
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.add('sidebar-hidden');
};

window.setTheme = (name) => {
    document.body.setAttribute('data-theme', name);
    const modal = document.getElementById('appearance-modal');
    if (modal) modal.classList.add('hidden');
};

document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('user-input');
    const recordBtn = document.getElementById('record-btn');
    const sendBtn = document.getElementById('send-btn');
    const voiceStatus = document.getElementById('voice-status');
    const statusTxt = document.getElementById('status');
    const micBtn = document.getElementById('mic-btn');
    const menuBtn = document.getElementById('menu-btn');
    const closeSidebar = document.getElementById('close-sidebar');

    if (document.body) document.body.setAttribute('data-theme', 'light-2');
    if (statusTxt) {
        statusTxt.innerText = "(Online)";
        statusTxt.classList.add('online');
    }

    // Splash Screen Logic
    const splash = document.getElementById('splash');
    if (splash) {
        setTimeout(() => {
            splash.style.opacity = '0';
            setTimeout(() => { splash.style.display = 'none'; }, 800);
        }, 1500);
    }

    if (userInput && recordBtn && sendBtn) {
        function updateInputHeight() {
            userInput.style.height = 'auto';
            const newHeight = Math.max(45, Math.min(userInput.scrollHeight, 100));
            userInput.style.height = newHeight + 'px';
        }

        function toggleButtons() {
            const text = userInput.value.trim();
            if (text.length > 0) {
                recordBtn.classList.add('hidden');
                sendBtn.classList.remove('hidden');
            } else {
                recordBtn.classList.remove('hidden');
                sendBtn.classList.add('hidden');
            }
        }

        async function sendMessage() {
            const text = userInput.value.trim();
            if (!text) return;

            appendMsg(text, 'user');
            userInput.value = '';
            updateInputHeight();
            toggleButtons();

            const reply = await fetchGroq(text);
            appendMsg(reply, 'bot');
        }

        userInput.addEventListener('input', () => {
            updateInputHeight();
            toggleButtons();
        });

        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        sendBtn.addEventListener('click', sendMessage);
    }

    // --- RECOGNITION ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.onstart = () => { if (micBtn) micBtn.classList.add('listening'); };
        recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript;
            if(voiceStatus) voiceStatus.innerText = `Sir: ${transcript}`;
            const reply = await fetchGroq(transcript);
            if(voiceStatus) voiceStatus.innerText = reply;
            speak(reply);
        };
        recognition.onend = () => { if (micBtn) micBtn.classList.remove('listening'); };

        const barRecognition = new SpeechRecognition();
        barRecognition.onstart = () => {
            recordBtn.style.color = "#ff4444";
            userInput.placeholder = "Listening...";
        };
        barRecognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript;
            appendMsg(transcript, 'user');
            const reply = await fetchGroq(transcript);
            appendMsg(reply, 'bot');
        };
        barRecognition.onend = () => {
            recordBtn.style.color = "#222222";
            userInput.placeholder = "Message Saki...";
        };

        if(recordBtn) recordBtn.onclick = () => {
            window.speechSynthesis.cancel();
            barRecognition.start();
        };

        if(micBtn) micBtn.onclick = () => {
            window.speechSynthesis.cancel();
            recognition.start();
        };
    }

    if (menuBtn) menuBtn.onclick = () => document.getElementById('sidebar')?.classList.remove('sidebar-hidden');
    if (closeSidebar) closeSidebar.onclick = () => document.getElementById('sidebar')?.classList.add('sidebar-hidden');

    async function fetchGroq(userText) {
        chatHistory.push({ role: "user", content: userText });
        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${SAKI_KEY}`
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: chatHistory,
                    temperature: 0.7
                })
            });
            const data = await response.json();
            const aiReply = data.choices[0].message.content;
            chatHistory.push({ role: "assistant", content: aiReply });
            if (chatHistory.length > 20) chatHistory.splice(1, 2);
            return aiReply;
        } catch (err) { 
            console.error(err);
            return "Sir, I'm having trouble connecting. Is your API key valid?"; 
        }
    }

    function appendMsg(text, sender) {
        const div = document.createElement('div');
        div.className = `msg ${sender}`;
        div.innerHTML = DOMPurify.sanitize(marked.parse(text));
        const container = document.getElementById('chat-messages');
        if(container) {
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
        }
    }

    window.stopVoiceSystem = () => {
        if (recognition) recognition.stop();
        window.speechSynthesis.cancel();
    };
});