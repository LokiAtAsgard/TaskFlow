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
let currentUser = null; // Store current user

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
        const auth = firebase.auth();
        firebaseDatabase = firebase.database();

        console.log("Firebase initialized successfully!");

        // === AUTH GUARD CHECK ===
        auth.onAuthStateChanged((user) => {
            if (!user) {
                console.log("No user signed in. Redirecting to Login...");
                window.location.href = "login.html";
            } else {
                console.log("User signed in:", user.email);
                currentUser = user;

                // **FIX: Use user-specific tasks path**
                tasksReference = firebaseDatabase.ref('users/' + user.uid + '/tasks');

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
            console.log("Loaded tasks:", allTasksArray);
        } else {
            allTasksArray = [];
            console.log("No tasks found for this user");
        }
        renderTasksToDisplay();
        updateStatisticsDisplay();
        updateProgressBarDisplay();
    }, (error) => {
        console.error("Error loading tasks:", error);
        updateFirebaseConnectionStatus('🔴 Error loading tasks', 'error');
    });
}

function testFirebaseConnection() {
    if (!currentUser) return;

    const testRef = firebaseDatabase.ref('users/' + currentUser.uid + '/connectionTest');
    const testData = { message: 'TaskFlow connection test', timestamp: Date.now() };

    testRef.set(testData)
        .then(() => testRef.once('value'))
        .then(snapshot => {
            const val = snapshot.val();
            if (val && val.message === testData.message) {
                console.log("Firebase connection test successful");
                updateFirebaseConnectionStatus('🟢 Connected as ' + currentUser.email, 'success');
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
    const signOutButton = document.getElementById('signOutButton');

    if (addNewTaskButton) addNewTaskButton.addEventListener('click', handleAddNewTaskClick);
    if (newTaskInput) newTaskInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') handleAddNewTaskClick();
    });

    if (filterButtonsContainer) filterButtonsContainer.addEventListener('click', handleFilterButtonClick);
    if (signOutButton) signOutButton.addEventListener('click', handleSignOut);
}

/* ================================
   TASK CRUD
   ================================ */
function handleAddNewTaskClick() {
    const input = document.getElementById('newTaskInput');
    const priority = document.getElementById('taskPriorityDropdown').value;
    const description = input.value.trim();

    if (description === '') {
        alert('Please enter a task description');
        return;
    }

    if (!tasksReference) {
        alert('Not connected to Firebase. Please refresh the page.');
        return;
    }

    const newTask = {
        description,
        priority,
        completed: false,
        createdAt: Date.now()
    };

    console.log("Adding new task:", newTask);

    const newRef = tasksReference.push();
    newRef.set(newTask)
        .then(() => {
            console.log("Task added successfully!");
            input.value = '';
        })
        .catch((error) => {
            console.error("Error adding task:", error);
            alert("Error adding task: " + error.message);
        });
}

function toggleTaskCompletion(taskKey, completed) {
    if (!tasksReference) return;

    tasksReference.child(taskKey).update({ completed })
        .then(() => console.log("Task completion toggled"))
        .catch(err => console.error("Error toggling task:", err));
}

function deleteTask(taskKey) {
    if (!tasksReference) return;

    if (confirm('Are you sure you want to delete this task?')) {
        tasksReference.child(taskKey).remove()
            .then(() => console.log("Task deleted"))
            .catch(err => console.error("Error deleting task:", err));
    }
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
        container.innerHTML = '<p class="noTasksMessage">No tasks found. Add your first task above!</p>';
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
   AUTH FUNCTIONS
   ================================ */
function handleSignOut() {
    if (confirm('Are you sure you want to sign out?')) {
        firebase.auth().signOut()
            .then(() => {
                console.log("User signed out successfully");
                window.location.href = "login.html";
            })
            .catch((error) => {
                console.error("Sign out error:", error);
                alert("Error signing out. Please try again.");
            });
    }
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