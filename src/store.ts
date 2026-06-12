import { create } from 'zustand';
import { UserProfile, CarbonData, Mission, INITIAL_USER, INITIAL_CARBON_DATA, ActionItem, Achievement, DEFAULT_ACHIEVEMENTS, Habit, DEFAULT_HABITS } from './types';
import axios from 'axios';
import { db, auth } from './lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, orderBy, limit, onSnapshot, serverTimestamp, addDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/firestore-utils';

axios.defaults.timeout = 10000;

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  metadata?: any;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

interface AppState {
  user: UserProfile;
  carbonData: CarbonData;
  missions: Mission[];
  actions: ActionItem[];
  achievements: Achievement[];
  habits: Habit[];
  activities: Activity[];
  notifications: Notification[];
  isLoading: boolean;
  
  // Actions
  setUser: (user: Partial<UserProfile>) => void;
  syncWithFirebase: (uid: string) => Promise<void>;
  setOnboardingComplete: (complete: boolean) => Promise<void>;
  updateCarbonData: () => Promise<void>;
  completeAction: (id: string) => Promise<void>;
  fetchRecommendations: () => Promise<void>;
  fetchMissions: () => Promise<void>;
  checkAchievements: () => Promise<void>;
  toggleHabit: (id: string) => Promise<void>;
  addHabit: (habit: Habit) => Promise<void>;
  removeHabit: (id: string) => Promise<void>;
  setReductionGoal: (goal: number) => Promise<void>;
  completeMission: (id: string) => Promise<void>;
  addActivity: (type: string, title: string, description: string, metadata?: any) => Promise<void>;
  addNotification: (title: string, message: string, link?: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  addXPEcoPoints: (xpGain: number, ecoPointsGain: number) => Promise<void>;
  updateStreak: () => Promise<void>;
  clearStore: () => void;
}

let unsubscribeActivities: (() => void) | null = null;
let unsubscribeNotifications: (() => void) | null = null;
let unsubscribeUser: (() => void) | null = null;

export const useAppStore = create<AppState>((set, get) => ({
  user: INITIAL_USER,
  carbonData: INITIAL_CARBON_DATA,
  missions: [],
  actions: [],
  achievements: DEFAULT_ACHIEVEMENTS,
  habits: DEFAULT_HABITS,
  activities: [],
  notifications: [],
  isLoading: false,

  clearStore: () => {
    if (unsubscribeActivities) unsubscribeActivities();
    if (unsubscribeNotifications) unsubscribeNotifications();
    if (unsubscribeUser) unsubscribeUser();
    unsubscribeActivities = null;
    unsubscribeNotifications = null;
    unsubscribeUser = null;
    set({
      user: INITIAL_USER,
      carbonData: INITIAL_CARBON_DATA,
      missions: [],
      actions: [],
      achievements: DEFAULT_ACHIEVEMENTS,
      habits: DEFAULT_HABITS,
      activities: [],
      notifications: [],
    });
  },

  syncWithFirebase: async (uid) => {
    set({ isLoading: true });
    try {
      const userRef = doc(db, 'users', uid);
      
      if (unsubscribeUser) unsubscribeUser();
      
      unsubscribeUser = onSnapshot(userRef, (userSnap) => {
        if (userSnap.exists()) {
          const data = userSnap.data();
          set({ 
            user: { ...INITIAL_USER, ...data.profile, ...data.stats }, 
            carbonData: data.carbonData || INITIAL_CARBON_DATA,
            missions: data.missions || [],
            achievements: data.achievements || DEFAULT_ACHIEVEMENTS,
            habits: data.habits || DEFAULT_HABITS
          });
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${uid}`);
      });
      
      if (unsubscribeActivities) unsubscribeActivities();
      if (unsubscribeNotifications) unsubscribeNotifications();

      // Setup snapshots for subcollections
      const activitiesQuery = query(collection(db, `users/${uid}/activities`), orderBy('timestamp', 'desc'), limit(50));
      unsubscribeActivities = onSnapshot(activitiesQuery, (snap) => {
        const activities = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
        set({ activities });
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${uid}/activities`);
      });

      const notificationsQuery = query(collection(db, `users/${uid}/notifications`), orderBy('timestamp', 'desc'), limit(50));
      unsubscribeNotifications = onSnapshot(notificationsQuery, (snap) => {
        const notifications = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
        set({ notifications });
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${uid}/notifications`);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    } finally {
      set({ isLoading: false });
    }
  },

  setUser: async (userUpdate) => {
    const { user } = get();
    const newUser = { ...user, ...userUpdate };
    set({ user: newUser });
    
    if (auth.currentUser) {
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, { profile: newUser });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
      }
    }
  },

  setOnboardingComplete: async (complete) => {
    set({ isLoading: true });
    try {
      const { user } = get();
      const updatedUser = { ...user, completedOnboarding: complete };
      set({ user: updatedUser });
      
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, { 'profile.completedOnboarding': complete });
      }

      await get().updateCarbonData();
      await Promise.all([
        get().fetchRecommendations(),
        get().fetchMissions()
      ]);
      await get().checkAchievements();
      
      await get().addActivity('profile', 'Onboarding Completed', 'You have successfully set up your green profile!');
    } finally {
      set({ isLoading: false });
    }
  },

  updateCarbonData: async () => {
    const { user, carbonData } = get();
    try {
      const response = await axios.post("/api/carbon/calculate", { profile: user });
      const { total, breakdown } = response.data;
      
      const budget = 300; 
      const newCarbonData = {
        ...carbonData,
        total: Math.round(total),
        spent: Math.round(total),
        budget,
        breakdown
      };
      
      set({ carbonData: newCarbonData });
      
      if (auth.currentUser) {
        try {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          await updateDoc(userRef, { carbonData: newCarbonData });
          
          // Also update leaderboard entry
          const lbRef = doc(db, 'leaderboard', auth.currentUser.uid);
          await setDoc(lbRef, {
            uid: auth.currentUser.uid,
            name: user.name,
            photoURL: auth.currentUser.photoURL,
            level: user.level,
            ecoPoints: user.ecoPoints,
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${auth.currentUser.uid}/carbonData`);
        }
      }
      
      await get().checkAchievements();
    } catch (error: any) {
      console.error("Failed to update carbon data", error.message);
    }
  },

  fetchRecommendations: async () => {
    const { user, carbonData } = get();
    try {
      const response = await axios.post("/api/recommendations", { 
        profile: user, 
        footprint: carbonData.breakdown 
      });
      set({ actions: response.data });
    } catch (error) {
      console.error("Failed to fetch recommendations", error);
    }
  },

  fetchMissions: async () => {
    const { user, missions: existingMissions } = get();
    try {
      const response = await axios.post("/api/missions", { profile: user });
      const incomingMissions = response.data;
      
      const mergedMissions = incomingMissions.map((incoming: Mission) => {
        const existing = existingMissions.find(m => m.id === incoming.id);
        return existing ? existing : incoming;
      });

      set({ missions: mergedMissions });
      
      if (auth.currentUser) {
        try {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          await updateDoc(userRef, { missions: mergedMissions });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}/missions`);
        }
      }
    } catch (error) {
      console.error("Failed to fetch missions", error);
    }
  },

  completeAction: async (id) => {
    const { actions } = get();
    const action = actions.find(a => a.id === id);
    if (!action || action.completed) return;

    const newActions = actions.map(a => a.id === id ? { ...a, completed: true } : a);
    set({ actions: newActions });
    
    // Add XP and EcoPoints for completing an action
    await get().addXPEcoPoints(15, 20);
    await get().updateStreak();
    await get().addActivity('action', 'Action Completed', `You completed: ${action.title}`);
    await get().checkAchievements();
  },

  checkAchievements: async () => {
    const { carbonData, achievements, user } = get();
    const baseline = 350;
    const historyValues = carbonData.history || [];
    const totalSpent = historyValues.reduce((sum, h) => sum + h.value, 0);
    const totalPotential = historyValues.length * baseline;
    const totalSaved = Math.max(0, totalPotential - totalSpent + (baseline - carbonData.total));

    let newlyUnlocked = false;
    const updatedAchievements = achievements.map(ach => {
      if (!ach.unlockedAt && totalSaved >= ach.milestoneKg) {
        newlyUnlocked = true;
        const timestamp = new Date().toISOString();
        get().addActivity('badge', 'Badge Unlocked', `Unlocked: ${ach.title}`);
        get().addNotification('New Badge!', `You've earned the ${ach.title} badge.`);
        return { ...ach, unlockedAt: timestamp };
      }
      return ach;
    });

    if (newlyUnlocked) {
      set({ achievements: updatedAchievements });
      if (auth.currentUser) {
        try {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          await updateDoc(userRef, { achievements: updatedAchievements });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}/achievements`);
        }
      }
    }
  },

  toggleHabit: async (id) => {
    const { habits } = get();
    const habitToToggle = habits.find(h => h.id === id);
    if (!habitToToggle) return;
    
    const isCompleting = !habitToToggle.completed;
    const newHabits = habits.map(h => h.id === id ? { ...h, completed: isCompleting } : h);
    set({ habits: newHabits });
    
    if (isCompleting) {
      await get().addXPEcoPoints(5, 5); // +XP
      await get().updateStreak();
    } else {
      await get().addXPEcoPoints(-5, -5); // -XP
    }

    if (auth.currentUser) {
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, { habits: newHabits });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}/habits`);
      }
    }
  },

  addHabit: async (habit) => {
    const { habits } = get();
    if (habits.find(h => h.id === habit.id)) return; // Already exists
    
    const newHabits = [...habits, habit];
    set({ habits: newHabits });
    
    if (auth.currentUser) {
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, { habits: newHabits });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}/habits`);
      }
    }
  },

  removeHabit: async (id) => {
    const { habits } = get();
    const habitToRemove = habits.find(h => h.id === id);
    if (!habitToRemove) return;
    
    // Reverse XP if it was completed
    if (habitToRemove.completed) {
      await get().addXPEcoPoints(-5, -5);
    }
    
    const newHabits = habits.filter(h => h.id !== id);
    set({ habits: newHabits });
    
    if (auth.currentUser) {
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, { habits: newHabits });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}/habits`);
      }
    }
  },
  
  setReductionGoal: async (goal) => {
    const { carbonData } = get();
    const previousGoal = carbonData.reductionGoal && !isNaN(Number(carbonData.reductionGoal))
      ? Number(carbonData.reductionGoal)
      : 50;

    let validatedGoal = Number(goal);
    if (goal === null || goal === undefined || isNaN(validatedGoal) || String(goal).trim() === '') {
      validatedGoal = previousGoal;
    }

    if (validatedGoal <= 0) {
      validatedGoal = previousGoal;
    }

    const newCarbonData = { ...carbonData, reductionGoal: validatedGoal };
    set({ carbonData: newCarbonData });
    
    if (auth.currentUser) {
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, { 'carbonData.reductionGoal': validatedGoal });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}/carbonData.reductionGoal`);
      }
    }
  },

  completeMission: async (id) => {
    const { missions } = get();
    const mission = missions.find(m => m.id === id);
    if (!mission || mission.completed) return;

    const newMissions = missions.map(m => m.id === id ? { ...m, completed: true, current: m.target } : m);
    set({ missions: newMissions });
    
    await get().addXPEcoPoints(mission.xpReward, mission.ecoPointsReward);
    await get().updateStreak();

    if (auth.currentUser) {
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, { missions: newMissions });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${auth.currentUser.uid}/mission_completion`);
      }
    }

    await get().addActivity('mission', 'Mission Accomplished', `Completed: ${mission.title}`);
  },

  addXPEcoPoints: async (xpGain, ecoPointsGain) => {
    const { user } = get();
    if (!user) return;
    
    let newXp = (user.xp || 0) + xpGain;
    let newLevel = user.level || 1;
    let newEcoPoints = (user.ecoPoints || 0) + ecoPointsGain;

    // Handle level down if XP goes negative over a level boundary
    while (newXp < 0 && newLevel > 1) {
      newLevel -= 1;
      newXp += 500;
    }
    
    // Don't allow XP to go below 0 on level 1
    if (newXp < 0) newXp = 0;
    
    // Don't allow EcoPoints to go below 0
    if (newEcoPoints < 0) newEcoPoints = 0;

    // Handle level up
    while (newXp >= 500) {
      newXp -= 500;
      newLevel += 1;
      get().addActivity('level', 'Level Up!', `You've reached Level ${newLevel}`);
      get().addNotification('Level Up!', `Congratulations! You are now level ${newLevel}.`);
    }

    const newUser = { ...user, xp: newXp, level: newLevel, ecoPoints: newEcoPoints };
    set({ user: newUser });
    
    if (auth.currentUser) {
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, { 
          'stats.xp': newXp,
          'stats.level': newLevel,
          'stats.ecoPoints': newEcoPoints,
          'profile.xp': newXp,
          'profile.level': newLevel,
          'profile.ecoPoints': newEcoPoints
        });
        
        // Update leaderboard
        const lbRef = doc(db, 'leaderboard', auth.currentUser.uid);
        await updateDoc(lbRef, { 
          level: newLevel, 
          ecoPoints: newEcoPoints,
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${auth.currentUser.uid}/stats`);
      }
    }
  },

  updateStreak: async () => {
    const { user } = get();
    const today = new Date().toISOString().split('T')[0];
    const lastActivity = user.lastActivityDate;

    let newStreak = user.streak || 0;
    
    if (!lastActivity) {
      newStreak = 1;
    } else {
      const lastDate = new Date(lastActivity);
      const todayDate = new Date(today);
      const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
    }
    
    if (lastActivity !== today) {
       get().setUser({ streak: newStreak, lastActivityDate: today });
       
       if (auth.currentUser) {
         try {
           const userRef = doc(db, 'users', auth.currentUser.uid);
           await updateDoc(userRef, { 
             'stats.streak': newStreak, 
             'profile.streak': newStreak,
             'stats.lastActivityDate': today,
             'profile.lastActivityDate': today
           });
         } catch(e) {}
       }
    }
  },

  addActivity: async (type, title, description, metadata) => {
    if (!auth.currentUser) return;
    try {
      const activitiesRef = collection(db, `users/${auth.currentUser.uid}/activities`);
      await addDoc(activitiesRef, {
        type,
        title,
        description,
        timestamp: serverTimestamp(),
        metadata: metadata || {}
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${auth.currentUser.uid}/activities`);
    }
  },

  addNotification: async (title, message, link) => {
    if (!auth.currentUser) return;
    try {
      const notificationsRef = collection(db, `users/${auth.currentUser.uid}/notifications`);
      await addDoc(notificationsRef, {
        title,
        message,
        link: link || '',
        read: false,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${auth.currentUser.uid}/notifications`);
    }
  },

  markNotificationRead: async (id) => {
    if (!auth.currentUser) return;
    try {
      const notifRef = doc(db, `users/${auth.currentUser.uid}/notifications`, id);
      await updateDoc(notifRef, { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}/notifications/${id}`);
    }
  }
}));
