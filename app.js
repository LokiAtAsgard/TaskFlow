/* ================================
   TASKFLOW FIREBASE APPLICATION
   ================================ */

/* ================================
   FIREBASE CONFIGURATION
   ================================ */
const firebaseConfig = {
    apiKey: "AIzaSyDIx6VqJR9HR5JVsiLHDJURu7zvabZYYoI",
    authDomain: "taskflow-aa2ec.firebaseapp.com",
    databaseURL: "https://taskflow-aa2ec-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "taskflow-aa2ec",
    storageBucket: "taskflow-aa2ec.firebasestorage.app",
    messagingSenderId: "1002898388073",
    appId: "1:1002898388073:web:1ae1aa8957ae3572ab9ef8",
    measurementId: "G-4NXTRCZQST"
};

let firebaseApp;
let firebaseDatabase;
let tasksReference;

let allTasksArray = [];
let currentActiveFilter = 'all';
let isFirebaseConnected = false;

/* ================================
   INITIALIZATION
   ================================ */
document.addEventListener('DOMContentLoaded', function () {
    initializeTaskFlowApplication();
});

function initializeTaskFlowApplication() {
    console.log("TaskFlow Firebase application is starting...");
    initializeFirebaseConnection();
    setupEventListeners();
}

/* ================================
   FIREBASE CONNECTION
   ================================ */
function initializeFirebaseConnection() {
    try {
        firebaseApp = firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth(); // Initialize Auth
        firebaseDatabase = firebase.database();
        tasksReference = firebaseDatabase.ref('tasks');

        console.log("Firebase initialized successfully!");

        // === AUTH GUARD CHECK ===
        auth.onAuthStateChanged((user) => {
            if (!user) {
                console.log("No user signed in. Redirecting to Login...");
                window.location.href = "login.html";
            } else {
                console.log("User signed in:", user.email);
                updateFirebaseConnectionStatus('🟢 Connected as ' + user.email, 'success');
                setupFirebaseRealTimeListener();
                testFirebaseConnection();
                isFirebaseConnected = true;
            }
        });

    } catch (err) {
        console.error('Firebase init error:', err);
        updateFirebaseConnectionStatus('🔴 Firebase connection failed', 'error');
        fallbackToLocalStorage();
    }
}

function setupFirebaseRealTimeListener() {
    tasksReference.on('value', function (snapshot) {
        console.log("Firebase data updated - syncing with UI...");
        const data = snapshot.val();
        if (data) {
            allTasksArray = Object.keys(data).map(key => ({
                firebaseKey: key,
                ...data[key]
            }));
        } else {
            allTasksArray = [];
        }
        renderTasksToDisplay();
        updateStatisticsDisplay();
        updateProgressBarDisplay();
    });
}

function testFirebaseConnection() {
    const testRef = firebaseDatabase.ref('connectionTest');
    const testData = { message: 'TaskFlow connection test', timestamp: Date.now() };

    testRef.set(testData)
        .then(() => testRef.once('value'))
        .then(snapshot => {
            const val = snapshot.val();
            if (val && val.message === testData.message) {
                console.log("Firebase connection test successful");
                // Status is already updated in the Auth listener
            }
            testRef.remove();
        })
        .catch(err => {
            console.error('Firebase connection test failed:', err);
            updateFirebaseConnectionStatus('🟠 Firebase connection unstable', 'warning');
        });
}

/* ================================
   EVENT LISTENERS
   ================================ */
function setupEventListeners() {
    const addNewTaskButton = document.getElementById('addNewTaskButton');
    const newTaskInput = document.getElementById('newTaskInput');
    const filterButtonsContainer = document.querySelector('.filterButtonsContainer');

    if (addNewTaskButton) addNewTaskButton.addEventListener('click', handleAddNewTaskClick);
    if (newTaskInput) newTaskInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') handleAddNewTaskClick();
    });

    if (filterButtonsContainer) filterButtonsContainer.addEventListener('click', handleFilterButtonClick);
}

/* ================================
   TASK CRUD
   ================================ */
function handleAddNewTaskClick() {
    const input = document.getElementById('newTaskInput');
    const priority = document.getElementById('taskPriorityDropdown').value;
    const description = input.value.trim();

    if (description === '') return;

    const newTask = {
        description,
        priority,
        completed: false,
        createdAt: Date.now()
    };

    const newRef = tasksReference.push();
    newRef.set(newTask);

    input.value = '';
}

function toggleTaskCompletion(taskKey, completed) {
    tasksReference.child(taskKey).update({ completed });
}

function deleteTask(taskKey) {
    tasksReference.child(taskKey).remove();
}

/* ================================
   HELPERS
   ================================ */
function priorityToStars(priority) {
    switch (priority) {
        case 'low': return '⭐';
        case 'medium': return '⭐⭐';
        case 'high': return '⭐⭐⭐';
        default: return '';
    }
}


/* ================================
   RENDER FUNCTIONS
   ================================ */
function renderTasksToDisplay() {
    const container = document.getElementById('taskListContainer');
    if (!container) return;

    container.innerHTML = '';

    let tasksToRender = [...allTasksArray];

    if (currentActiveFilter === 'pending') {
        tasksToRender = tasksToRender.filter(t => !t.completed);
    } else if (currentActiveFilter === 'completed') {
        tasksToRender = tasksToRender.filter(t => t.completed);
    } else if (currentActiveFilter === 'high') {
        tasksToRender = tasksToRender.filter(t => t.priority === 'high');
    }

    if (tasksToRender.length === 0) {
        container.innerHTML = '<p>No tasks found.</p>';
        return;
    }

    tasksToRender.forEach(task => {
        const taskDiv = document.createElement('div');
        taskDiv.className = `taskItem ${task.completed ? 'completed' : ''}`;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.completed;
        checkbox.addEventListener('change', () =>
            toggleTaskCompletion(task.firebaseKey, checkbox.checked)
        );

        const span = document.createElement('span');
        span.innerHTML = `<span class="priorityStars">${priorityToStars(task.priority)}</span> ${task.description}`;

        const delBtn = document.createElement('button');
        delBtn.textContent = '❌';
        delBtn.addEventListener('click', () => deleteTask(task.firebaseKey));

        taskDiv.appendChild(checkbox);
        taskDiv.appendChild(span);
        taskDiv.appendChild(delBtn);

        container.appendChild(taskDiv);
    });
}

function updateStatisticsDisplay() {
    const total = allTasksArray.length;
    const completed = allTasksArray.filter(t => t.completed).length;
    const pending = total - completed;

    const totalEl = document.getElementById('totalTasksDisplay');
    const completedEl = document.getElementById('completedTasksDisplay');
    const pendingEl = document.getElementById('pendingTasksDisplay');

    if (totalEl) totalEl.textContent = total;
    if (completedEl) completedEl.textContent = completed;
    if (pendingEl) pendingEl.textContent = pending;
}

function updateProgressBarDisplay() {
    const completed = allTasksArray.filter(t => t.completed).length;
    const total = allTasksArray.length;
    const percent = total > 0 ? (completed / total) * 100 : 0;

    const bar = document.getElementById('taskProgressBar');
    if (bar) bar.style.width = percent + '%';
}

/* ================================
   FILTER HANDLING
   ================================ */
function handleFilterButtonClick(e) {
    if (!e.target.matches('.filterButton')) return;

    document.querySelectorAll('.filterButton').forEach(btn =>
        btn.classList.remove('activeFilter')
    );
    e.target.classList.add('activeFilter');

    currentActiveFilter = e.target.dataset.filter;
    renderTasksToDisplay();
}

/* ================================
   STATUS HELPERS
   ================================ */
function updateFirebaseConnectionStatus(msg, type) {
    const el = document.getElementById('firebaseStatusText');
    if (el) {
        el.textContent = msg;
        el.className = `firebaseStatus status-${type}`;
    }
}

function fallbackToLocalStorage() {
    console.warn("Falling back to local storage...");
    updateFirebaseConnectionStatus('🟡 Using offline mode', 'warning');
}
