import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, Plus, Trash2, Edit2, Save, X, Calendar, Clock, Moon, Sun, Utensils, Dumbbell, Apple, Heart, BookOpen, Bell, BellOff } from 'lucide-react';

const DailyRoutineTracker = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState({ lat: 36.7538, lng: 3.0588 }); // Ain Benian default
  const [prayerTimes, setPrayerTimes] = useState({});
  const [tasks, setTasks] = useState({});
  const [regime, setRegime] = useState([]);
  const [studyTimetable, setStudyTimetable] = useState([]);
  const [editingRegime, setEditingRegime] = useState(false);
  const [editingStudy, setEditingStudy] = useState(false);
  const [newRegimeItem, setNewRegimeItem] = useState('');
  const [newStudyItem, setNewStudyItem] = useState({ day: '', time: '', subject: '' });
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasManualDate, setHasManualDate] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [sentNotifications, setSentNotifications] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sentNotifications') || '{}');
    } catch {
      return {};
    }
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const stored = localStorage.getItem('selectedDate');
    return stored || new Date().toISOString().split('T')[0];
  });

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }
  }, []);

  // Initialize data from storage
  useEffect(() => {
    try {
      const storedTasks = JSON.parse(localStorage.getItem('dailyTasks') || '{}');
      const storedRegime = JSON.parse(localStorage.getItem('regime') || '[]');
      const storedStudy = JSON.parse(localStorage.getItem('studyTimetable') || '[]');
      const storedLocation = JSON.parse(localStorage.getItem('location') || 'null');
      const storedDate = localStorage.getItem('selectedDate');
      
      if (storedTasks && Object.keys(storedTasks).length > 0) {
        setTasks(storedTasks);
      }
      if (storedRegime && storedRegime.length > 0) {
        setRegime(storedRegime);
      }
      if (storedStudy && storedStudy.length > 0) {
        setStudyTimetable(storedStudy);
      }
      if (storedLocation) {
        setLocation(storedLocation);
      }
      const todayStr = new Date().toISOString().split('T')[0];
      if (storedDate) {
        setSelectedDate(storedDate);
        setHasManualDate(storedDate !== todayStr);
      }
      
      // Get user location
      if (navigator.geolocation && !storedLocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setLocation(newLocation);
            localStorage.setItem('location', JSON.stringify(newLocation));
          },
          (error) => console.log('Location access denied')
        );
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Calculate prayer times
  useEffect(() => {
    const calculatePrayerTimes = () => {
      const date = new Date();
      const times = {
        Fajr: '05:30',
        Dhuhr: '12:45',
        Asr: '15:30',
        Maghrib: '18:00',
        Isha: '19:30'
      };
      setPrayerTimes(times);
    };
    calculatePrayerTimes();
  }, [location]);

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Helper function to send notification
  const sendNotification = (title, body, tag) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: body,
        icon: '/favicon.ico',
        tag: tag, // Prevents duplicate notifications
        requireInteraction: false,
      });
      
      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    }
  };

  // Check and send notifications for tasks
  useEffect(() => {
    if (!isInitialized || notificationPermission !== 'granted') return;
    
    const checkNotifications = () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
      
      // Check if it's a new day - reset sent notifications
      const lastNotificationDate = localStorage.getItem('lastNotificationDate');
      if (lastNotificationDate !== today) {
        setSentNotifications({});
        localStorage.setItem('lastNotificationDate', today);
        localStorage.setItem('sentNotifications', JSON.stringify({}));
      }

      // Check prayer times
      Object.entries(prayerTimes).forEach(([prayer, time]) => {
        const taskId = `pray_${prayer}`;
        const notificationKey = `${today}_${taskId}_${time}`;
        
        // Check if task is not completed and time matches (within 1 minute window)
        if (!tasks[today]?.[taskId] && !sentNotifications[notificationKey]) {
          const [hour, minute] = time.split(':').map(Number);
          if (currentHour === hour && Math.abs(currentMinute - minute) <= 1) {
            sendNotification(
              `⏰ Prayer Time: ${prayer}`,
              `It's time for ${prayer} prayer`,
              notificationKey
            );
            setSentNotifications(prev => {
              const updated = { ...prev, [notificationKey]: true };
              localStorage.setItem('sentNotifications', JSON.stringify(updated));
              return updated;
            });
          }
        }
      });

      // Check meal times
      const mealTimes = [
        { id: 'breakfast', time: '08:00', name: 'Breakfast' },
        { id: 'lunch', time: '13:00', name: 'Lunch' },
        { id: 'dinner', time: '20:00', name: 'Dinner' }
      ];

      mealTimes.forEach(({ id, time, name }) => {
        const notificationKey = `${today}_${id}_${time}`;
        if (!tasks[today]?.[id] && !sentNotifications[notificationKey]) {
          const [hour, minute] = time.split(':').map(Number);
          if (currentHour === hour && Math.abs(currentMinute - minute) <= 1) {
            sendNotification(
              `🍽️ Meal Time: ${name}`,
              `Time to have ${name.toLowerCase()}`,
              notificationKey
            );
            setSentNotifications(prev => {
              const updated = { ...prev, [notificationKey]: true };
              localStorage.setItem('sentNotifications', JSON.stringify(updated));
              return updated;
            });
          }
        }
      });

      // Check sport time (Sunday, Wednesday, Saturday at 21:00)
      const dayOfWeek = now.getDay();
      const sportDays = [0, 3, 6]; // Sunday, Wednesday, Saturday
      if (sportDays.includes(dayOfWeek)) {
        const notificationKey = `${today}_sport_21:00`;
        if (!tasks[today]?.sport && !sentNotifications[notificationKey]) {
          if (currentHour === 21 && Math.abs(currentMinute - 0) <= 1) {
            sendNotification(
              `💪 Workout Time`,
              `Time for your workout session!`,
              notificationKey
            );
            setSentNotifications(prev => {
              const updated = { ...prev, [notificationKey]: true };
              localStorage.setItem('sentNotifications', JSON.stringify(updated));
              return updated;
            });
          }
        }
      }

      // Check skincare time (Friday at 09:00)
      if (dayOfWeek === 5) { // Friday
        const notificationKey = `${today}_skincare_09:00`;
        if (!tasks[today]?.skincare && !sentNotifications[notificationKey]) {
          if (currentHour === 9 && Math.abs(currentMinute - 0) <= 1) {
            sendNotification(
              `💆 Skincare Routine`,
              `Time for your skincare routine!`,
              notificationKey
            );
            setSentNotifications(prev => {
              const updated = { ...prev, [notificationKey]: true };
              localStorage.setItem('sentNotifications', JSON.stringify(updated));
              return updated;
            });
          }
        }
      }

      // Check study times
      studyTimetable.forEach((item, index) => {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDayName = dayNames[dayOfWeek];
        
        if (item.day === currentDayName) {
          const notificationKey = `${today}_study_${index}_${item.time}`;
          if (!tasks[today]?.[`study_${index}`] && !sentNotifications[notificationKey]) {
            const [hour, minute] = item.time.split(':').map(Number);
            if (currentHour === hour && Math.abs(currentMinute - minute) <= 1) {
              sendNotification(
                `📚 Study Time: ${item.subject}`,
                `Time to study ${item.subject}`,
                notificationKey
              );
              setSentNotifications(prev => {
                const updated = { ...prev, [notificationKey]: true };
                localStorage.setItem('sentNotifications', JSON.stringify(updated));
                return updated;
              });
            }
          }
        }
      });
    };

    // Check immediately
    checkNotifications();
    
    // Check every minute
    const notificationInterval = setInterval(checkNotifications, 60000);
    
    return () => clearInterval(notificationInterval);
  }, [currentTime, prayerTimes, tasks, studyTimetable, isInitialized, notificationPermission, sentNotifications]);

  // Save tasks to storage (only after initialization)
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem('dailyTasks', JSON.stringify(tasks));
      } catch (error) {
        console.error('Error saving tasks to localStorage:', error);
      }
    }
  }, [tasks, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem('regime', JSON.stringify(regime));
      } catch (error) {
        console.error('Error saving regime to localStorage:', error);
      }
    }
  }, [regime, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem('studyTimetable', JSON.stringify(studyTimetable));
      } catch (error) {
        console.error('Error saving study timetable to localStorage:', error);
      }
    }
  }, [studyTimetable, isInitialized]);

  // Save selected date
  useEffect(() => {
    if (isInitialized && selectedDate) {
      try {
        localStorage.setItem('selectedDate', selectedDate);
      } catch (error) {
        console.error('Error saving selected date to localStorage:', error);
      }
    }
  }, [selectedDate, isInitialized]);

  // Save sent notifications
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem('sentNotifications', JSON.stringify(sentNotifications));
      } catch (error) {
        console.error('Error saving sent notifications to localStorage:', error);
      }
    }
  }, [sentNotifications, isInitialized]);

  // Auto-sync date with today's date unless user chose custom date
  useEffect(() => {
    if (!isInitialized || hasManualDate) return;
    const todayStr = new Date().toISOString().split('T')[0];
    if (selectedDate !== todayStr) {
      setSelectedDate(todayStr);
    }
  }, [currentTime, hasManualDate, isInitialized, selectedDate]);

  const handleDateChange = (value) => {
    setSelectedDate(value);
    const todayStr = new Date().toISOString().split('T')[0];
    setHasManualDate(value !== todayStr);
  };

  const toggleTask = (date, taskId) => {
    setTasks(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        [taskId]: !prev[date]?.[taskId]
      }
    }));
  };

  const addRegimeItem = () => {
    if (newRegimeItem.trim()) {
      setRegime([...regime, newRegimeItem.trim()]);
      setNewRegimeItem('');
    }
  };

  const deleteRegimeItem = (index) => {
    setRegime(regime.filter((_, i) => i !== index));
  };

  const addStudyItem = () => {
    if (newStudyItem.day && newStudyItem.time && newStudyItem.subject) {
      setStudyTimetable([...studyTimetable, { ...newStudyItem }]);
      setNewStudyItem({ day: '', time: '', subject: '' });
    }
  };

  const deleteStudyItem = (index) => {
    setStudyTimetable(studyTimetable.filter((_, i) => i !== index));
  };

  const getDayOfWeek = (dateStr) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date(dateStr).getDay()];
  };

  const getDayIndex = (dateStr) => new Date(dateStr).getDay();

  const isTaskDue = (taskType) => {
    const day = getDayOfWeek(selectedDate);
    const now = currentTime;
    const hour = now.getHours();
    
    if (taskType === 'sport') {
      return ['Sunday', 'Wednesday', 'Saturday'].includes(day) && hour >= 21;
    }
    if (taskType === 'skincare') {
      return day === 'Friday' && hour >= 9;
    }
    return true;
  };

  const getTaskIcon = (type) => {
    const icons = {
      pray: Moon,
      breakfast: Sun,
      lunch: Utensils,
      dinner: Utensils,
      sport: Dumbbell,
      regime: Apple,
      skincare: Heart,
      study: BookOpen
    };
    const Icon = icons[type] || Circle;
    return <Icon className="w-5 h-5" />;
  };

  const TaskCard = ({ id, title, time, checked, onToggle, icon }) => (
    <div 
      onClick={onToggle}
      className={`p-4 rounded-2xl cursor-pointer transition-all duration-300 transform hover:scale-105 ${
        checked 
          ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-lg' 
          : 'bg-white hover:bg-gray-50 border-2 border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`${checked ? 'text-white' : 'text-indigo-600'}`}>
            {icon}
          </div>
          <div>
            <h3 className={`font-semibold ${checked ? 'text-white' : 'text-gray-800'}`}>
              {title}
            </h3>
            {time && (
              <p className={`text-sm ${checked ? 'text-green-100' : 'text-gray-500'}`}>
                <Clock className="w-3 h-3 inline mr-1" />
                {time}
              </p>
            )}
          </div>
        </div>
        {checked ? (
          <CheckCircle className="w-6 h-6 text-white" />
        ) : (
          <Circle className="w-6 h-6 text-gray-300" />
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Daily Routine Tracker
              </h1>
              <p className="text-gray-600 mt-2">
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {notificationPermission === 'granted' ? (
                <div className="flex items-center gap-2 text-green-600" title="Notifications enabled">
                  <Bell className="w-6 h-6" />
                  <span className="text-sm font-medium">Enabled</span>
                </div>
              ) : notificationPermission === 'denied' ? (
                <div className="flex items-center gap-2 text-red-600" title="Notifications blocked">
                  <BellOff className="w-6 h-6" />
                  <span className="text-sm font-medium">Blocked</span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if ('Notification' in window) {
                      Notification.requestPermission().then(permission => {
                        setNotificationPermission(permission);
                      });
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  title="Enable notifications"
                >
                  <Bell className="w-5 h-5" />
                  <span className="text-sm font-medium">Enable</span>
                </button>
              )}
              <Calendar className="w-12 h-12 text-indigo-600" />
            </div>
          </div>
          
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full p-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Prayer Times */}
          <div className="bg-white rounded-3xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Moon className="text-indigo-600" />
              Prayer Times
            </h2>
            <div className="space-y-3">
              {Object.entries(prayerTimes).map(([prayer, time]) => (
                <TaskCard
                  key={prayer}
                  id={`pray_${prayer}`}
                  title={prayer}
                  time={time}
                  checked={tasks[selectedDate]?.[`pray_${prayer}`]}
                  onToggle={() => toggleTask(selectedDate, `pray_${prayer}`)}
                  icon={getTaskIcon('pray')}
                />
              ))}
            </div>
          </div>

          {/* Meals */}
          <div className="bg-white rounded-3xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Utensils className="text-indigo-600" />
              Meals
            </h2>
            <div className="space-y-3">
              <TaskCard
                id="breakfast"
                title="Breakfast"
                time="08:00"
                checked={tasks[selectedDate]?.breakfast}
                onToggle={() => toggleTask(selectedDate, 'breakfast')}
                icon={getTaskIcon('breakfast')}
              />
              <TaskCard
                id="lunch"
                title="Lunch"
                time="13:00"
                checked={tasks[selectedDate]?.lunch}
                onToggle={() => toggleTask(selectedDate, 'lunch')}
                icon={getTaskIcon('lunch')}
              />
              <TaskCard
                id="dinner"
                title="Dinner"
                time="20:00"
                checked={tasks[selectedDate]?.dinner}
                onToggle={() => toggleTask(selectedDate, 'dinner')}
                icon={getTaskIcon('dinner')}
              />
            </div>
          </div>

          {/* Sport */}
          <div className="bg-white rounded-3xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Dumbbell className="text-indigo-600" />
              Sport
            </h2>
            <div className="space-y-3">
              {['Sunday', 'Wednesday', 'Saturday'].includes(getDayOfWeek(selectedDate)) ? (
                <TaskCard
                  id="sport"
                  title="Workout Session"
                  time="21:00"
                  checked={tasks[selectedDate]?.sport}
                  onToggle={() => toggleTask(selectedDate, 'sport')}
                  icon={getTaskIcon('sport')}
                />
              ) : (
                <div className="p-4 bg-gray-100 rounded-xl text-center text-gray-600">
                  No sport scheduled today
                </div>
              )}
            </div>
          </div>

          {/* Skincare */}
          <div className="bg-white rounded-3xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Heart className="text-indigo-600" />
              Skincare & Healthcare
            </h2>
            <div className="space-y-3">
              {getDayOfWeek(selectedDate) === 'Friday' ? (
                <TaskCard
                  id="skincare"
                  title="Skincare Routine"
                  time="09:00"
                  checked={tasks[selectedDate]?.skincare}
                  onToggle={() => toggleTask(selectedDate, 'skincare')}
                  icon={getTaskIcon('skincare')}
                />
              ) : (
                <div className="p-4 bg-gray-100 rounded-xl text-center text-gray-600">
                  Skincare scheduled on Friday
                </div>
              )}
            </div>
          </div>

          {/* Regime */}
          <div className="bg-white rounded-3xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Apple className="text-indigo-600" />
                Diet Regime
              </h2>
              <button
                onClick={() => setEditingRegime(!editingRegime)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {editingRegime ? <X className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
              </button>
            </div>
            
            {editingRegime && (
              <div className="mb-4 flex gap-2">
                <input
                  type="text"
                  value={newRegimeItem}
                  onChange={(e) => setNewRegimeItem(e.target.value)}
                  placeholder="Add regime item..."
                  className="flex-1 p-2 border-2 border-indigo-200 rounded-lg focus:outline-none focus:border-indigo-500"
                  onKeyPress={(e) => e.key === 'Enter' && addRegimeItem()}
                />
                <button
                  onClick={addRegimeItem}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            )}

            <div className="space-y-2">
              {regime.length > 0 ? (
                regime.map((item, index) => {
                  const dayIndex = getDayIndex(selectedDate);
                  const isToday = index === dayIndex % regime.length;
                  return (
                    <div
                      key={index}
                      className={`p-3 rounded-xl flex items-center justify-between ${
                        isToday ? 'bg-indigo-50 border-2 border-indigo-300' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isToday && (
                          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
                        )}
                        <span className={isToday ? 'font-semibold text-indigo-700' : 'text-gray-700'}>
                          {item}
                        </span>
                      </div>
                      {editingRegime && (
                        <button
                          onClick={() => deleteRegimeItem(index)}
                          className="p-1 hover:bg-red-100 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-4 bg-gray-100 rounded-xl text-center text-gray-600">
                  Add your diet regime items
                </div>
              )}
            </div>
          </div>

          {/* Study */}
          <div className="bg-white rounded-3xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <BookOpen className="text-indigo-600" />
                Study Schedule
              </h2>
              <button
                onClick={() => setEditingStudy(!editingStudy)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {editingStudy ? <X className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
              </button>
            </div>

            {editingStudy && (
              <div className="mb-4 space-y-2">
                <select
                  value={newStudyItem.day}
                  onChange={(e) => setNewStudyItem({...newStudyItem, day: e.target.value})}
                  className="w-full p-2 border-2 border-indigo-200 rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select day...</option>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
                <input
                  type="time"
                  value={newStudyItem.time}
                  onChange={(e) => setNewStudyItem({...newStudyItem, time: e.target.value})}
                  className="w-full p-2 border-2 border-indigo-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  value={newStudyItem.subject}
                  onChange={(e) => setNewStudyItem({...newStudyItem, subject: e.target.value})}
                  placeholder="Subject..."
                  className="w-full p-2 border-2 border-indigo-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={addStudyItem}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Study Session
                </button>
              </div>
            )}

            <div className="space-y-2">
              {studyTimetable.filter(item => item.day === getDayOfWeek(selectedDate)).length > 0 ? (
                studyTimetable
                  .filter(item => item.day === getDayOfWeek(selectedDate))
                  .map((item, index) => (
                    <div key={index} className="p-3 bg-indigo-50 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-indigo-700">{item.subject}</p>
                          <p className="text-sm text-gray-600">{item.time}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {editingStudy && (
                            <button
                              onClick={() => deleteStudyItem(studyTimetable.indexOf(item))}
                              className="p-1 hover:bg-red-100 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          )}
                          <button
                            onClick={() => toggleTask(selectedDate, `study_${index}`)}
                            className="p-1"
                          >
                            {tasks[selectedDate]?.[`study_${index}`] ? (
                              <CheckCircle className="w-6 h-6 text-green-600" />
                            ) : (
                              <Circle className="w-6 h-6 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="p-4 bg-gray-100 rounded-xl text-center text-gray-600">
                  No study sessions today
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress Summary */}
        <div className="mt-6 bg-white rounded-3xl shadow-xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Today's Progress</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-600 to-purple-600 h-full transition-all duration-500"
                style={{
                  width: `${
                    tasks[selectedDate]
                      ? (Object.values(tasks[selectedDate]).filter(Boolean).length /
                          Math.max(
                            Object.keys(prayerTimes).length + 3 + 
                            (['Sunday', 'Wednesday', 'Saturday'].includes(getDayOfWeek(selectedDate)) ? 1 : 0) +
                            (getDayOfWeek(selectedDate) === 'Friday' ? 1 : 0) +
                            studyTimetable.filter(item => item.day === getDayOfWeek(selectedDate)).length,
                            1
                          )) *
                        100
                      : 0
                  }%`
                }}
              />
            </div>
            <span className="font-bold text-indigo-600 text-lg">
              {tasks[selectedDate]
                ? `${Object.values(tasks[selectedDate]).filter(Boolean).length} / ${
                    Object.keys(prayerTimes).length + 3 + 
                    (['Sunday', 'Wednesday', 'Saturday'].includes(getDayOfWeek(selectedDate)) ? 1 : 0) +
                    (getDayOfWeek(selectedDate) === 'Friday' ? 1 : 0) +
                    studyTimetable.filter(item => item.day === getDayOfWeek(selectedDate)).length
                  }`
                : '0 / 0'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyRoutineTracker;