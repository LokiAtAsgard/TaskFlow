/* ================================
   TASKFLOW FIREBASE APPLICATION
   ================================ */

/* ================================
   FIREBASE CONFIGURATION
   ================================ */

// Firebase configuration object (your project config)
const firebaseConfig = {
    apiKey: "AIzaSyDIx6VqJR9HR5JVsiLHDJURu7zvabZYYoI",
    authDomain: "taskflow-aa2ec.firebaseapp.com",
    projectId: "taskflow-aa2ec",
    storageBucket: "taskflow-aa2ec.firebasestorage.app",
    messagingSenderId: "1002898388073",
    appId: "1:1002898388073:web:1ae1aa8957ae3572ab9ef8",
    measurementId: "G-4NXTRCZQST"
  };
  
  // Initialize Firebase
  let firebaseApp;
  let firebaseDatabase;
  let tasksReference; // Reference to the 'tasks' node in Firebase
  
  /* ================================
     GLOBAL VARIABLES AND STATE
     ================================ */
  
  // Main array to store all task objects (synced with Firebase)
  let allTasksArray = [];
  
  // Variable to track which filter is currently active (all, pending, completed, high)
  let currentActiveFilter = 'all';
  
  // Firebase connection status
  let isFirebaseConnected = false;
  
  /* ================================
     APPLICATION INITIALIZATION
     ================================ */
  
  // Wait for the DOM (HTML) to fully load before running JavaScript
  document.addEventListener('DOMContentLoaded', function() {
      initializeTaskFlowApplication();
  });
  
  /**
   * Initialize the TaskFlow application with Firebase
   */
  function initializeTaskFlowApplication() {
      console.log('TaskFlow Firebase application is starting...');
  
      // Initialize Firebase connection
      initializeFirebaseConnection();
  
      // Set up event listeners for user interactions
      setupEventListeners();
  
      console.log('TaskFlow application initialized successfully!');
  }
  
  /* ================================
     FIREBASE INITIALIZATION AND CONNECTION
     ================================ */
  
  function initializeFirebaseConnection() {
      try {
          // Initialize Firebase app
          firebaseApp = firebase.initializeApp(firebaseConfig);
          firebaseDatabase = firebase.database();
  
          // Create reference to the 'tasks' node in Firebase database
          tasksReference = firebaseDatabase.ref('tasks');
  
          console.log('Firebase initialized successfully!');
          updateFirebaseConnectionStatus('🟢 Connected to Firebase', 'success');
  
          // Set up real-time listener for tasks data
          setupFirebaseRealTimeListener();
  
          // Test the connection
          testFirebaseConnection();
  
          isFirebaseConnected = true;
      } catch (firebaseError) {
          console.error('Firebase initialization error:', firebaseError);
          updateFirebaseConnectionStatus('🔴 Firebase connection failed', 'error');
  
          // Fall back to local storage if Firebase fails
          fallbackToLocalStorage();
      }
  }
  
  /**
   * Set up real-time listener for Firebase data changes
   */
  function setupFirebaseRealTimeListener() {
      tasksReference.on('value', function(firebaseSnapshot) {
          console.log('Firebase data updated - syncing with UI...');
  
          const firebaseTasksData = firebaseSnapshot.val();
  
          if (firebaseTasksData) {
              allTasksArray = Object.keys(firebaseTasksData).map(taskKey => ({
                  firebaseKey: taskKey,
                  ...firebaseTasksData[taskKey]
              }));
          } else {
              allTasksArray = [];
          }
  
          renderTasksToDisplay();
          updateStatisticsDisplay();
          updateProgressBarDisplay();
  
          console.log(`Synced ${allTasksArray.length} tasks from Firebase`);
      }, function(error) {
          console.error('Firebase listener error:', error);
          updateFirebaseConnectionStatus('🟠 Connection issues detected', 'warning');
      });
  }
  
  /**
   * Test Firebase connection by writing and reading a test value
   */
  function testFirebaseConnection() {
      const testReference = firebaseDatabase.ref('connectionTest');
      const testData = {
          timestamp: Date.now(),
          message: 'TaskFlow connection test'
      };
  
      testReference.set(testData)
          .then(() => testReference.once('value'))
          .then((snapshot) => {
              const readData = snapshot.val();
              if (readData && readData.message === testData.message) {
                  console.log('Firebase connection test successful');
                  updateFirebaseConnectionStatus('🟢 Firebase fully operational', 'success');
              }
              testReference.remove();
          })
          .catch((error) => {
              console.error('Firebase connection test failed:', error);
              updateFirebaseConnectionStatus('🟠 Firebase connection unstable', 'warning');
          });
  }
  
  /* ================================
     STATUS DISPLAY HELPERS
     ================================ */
  
  function updateFirebaseConnectionStatus(statusMessage, statusType) {
      const statusElement = document.getElementById('firebaseStatusText');
      if (statusElement) {
          statusElement.textContent = statusMessage;
          statusElement.classList.remove('status-success', 'status-error', 'status-warning');
          statusElement.classList.add(`status-${statusType}`);
      }
  }
  
  function fallbackToLocalStorage() {
      console.log('Falling back to local storage...');
      isFirebaseConnected = false;
  
      loadTasksFromLocalStorage();
      renderTasksToDisplay();
      updateStatisticsDisplay();
      updateProgressBarDisplay();
      updateFirebaseConnectionStatus('🟡 Using offline mode', 'warning');
  }
  
  /* ================================
     EVENT LISTENER SETUP
     ================================ */
  
  function setupEventListeners() {
      const newTaskInputField = document.getElementById('newTaskInput');
      const addNewTaskButton = document.getElementById('addNewTaskButton');
      const filterButtonsContainer = document.querySelector('.filterButtonsContainer');
  
      addNewTaskButton.addEventListener('click', handleAddNewTaskClick);
  
      newTaskInputField.addEventListener('keypress', function(keyboardEvent) {
          if (keyboardEvent.key === 'Enter') {
              handleAddNewTaskClick();
          }
      });
  
      filterButtonsContainer.addEventListener('click', handleFilterButtonClick);
  
      window.addEventListener('beforeunload', function(event) {
          if (!isFirebaseConnected && allTasksArray.length > 0) {
              event.preventDefault();
              event.returnValue = 'You have unsaved tasks. Are you sure you want to leave?';
          }
      });
  }
  
  /* ================================
     (rest of your functions remain unchanged)
     ================================ */
  