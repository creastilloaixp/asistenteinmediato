import { createStore } from 'zustand/vanilla';

const store = createStore((set, get) => ({
  count: 0,
  isInit: false,
  init: () => {
    set({ isInit: true });
  }
}));

const state1 = store.getState();
state1.init();
const state2 = store.getState();

console.log(state1.init === state2.init); // Should be true
