<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import api from '../api/auth'; // 假设你已经在 api/auth.js 里封装了 axios

const mapData = ref([]);
const buildings = ref([]);
const islandStatus = ref({});
const coins = ref(0);
const selectedCell = ref(null); // {x: 0, y: 0}
const logMessage = ref("");

// 建造菜单配置
const buildMenu = [
  { type: 'lumberjack', name: 'Lumberjack (Wood)', cost: 100 },
  { type: 'house_t1', name: 'Pioneer House', cost: 0 },
  { type: 'fishery', name: 'Fishery (Fish)', cost: 200 },
  { type: 'sheep_farm', name: 'Sheep Farm', cost: 300 },
  { type: 'weaver', name: 'Weaver (Clothes)', cost: 400 },
];

let tickInterval = null;

const fetchState = async () => {
  try {
    const res = await api.get('/game/state');
    mapData.value = res.data.map;
    islandStatus.value = res.data.status;
    buildings.value = res.data.buildings;
    coins.value = res.data.coins;
  } catch (e) {
    console.error(e);
  }
};

const handleTick = async () => {
  try {
    const res = await api.post('/game/tick');
    islandStatus.value = res.data.status;
    coins.value = res.data.coins;
    logMessage.value = res.data.log;
  } catch (e) {
    console.error("Tick failed", e);
  }
};

const handleCellClick = (x, y) => {
  selectedCell.value = { x, y };
};

const buildStructure = async (type) => {
  if (!selectedCell.value) return;
  try {
    const res = await api.post('/game/build', {
      type: type,
      x: selectedCell.value.x,
      y: selectedCell.value.y
    });
    coins.value = res.data.coins;
    // 重新获取状态以刷新建筑显示
    fetchState();
    selectedCell.value = null; // 关闭菜单
  } catch (e) {
    alert(e.response?.data?.message || "Build failed");
  }
};

// 获取某个格子的建筑
const getBuildingAt = (x, y) => {
  return buildings.value.find(b => b.x === x && b.y === y);
};

// 建筑缩写显示
const getBuildingSymbol = (type) => {
  const map = {
    'lumberjack': '🌲',
    'house_t1': '🏠',
    'fishery': '🐟',
    'sheep_farm': '🐑',
    'weaver': '👕'
  };
  return map[type] || '🏗️';
};

onMounted(() => {
  fetchState();
  // 启动 Tick 循环，每 60 秒触发一次
  tickInterval = setInterval(handleTick, 60000);
});

onUnmounted(() => {
  if (tickInterval) clearInterval(tickInterval);
});
</script>

<template>
  <div class="game-container">
    <div class="status-bar">
      <div class="resource">💰 {{ coins }}</div>
      <div class="resource">🌲 {{ islandStatus.wood }}</div>
      <div class="resource">🐟 {{ islandStatus.fish }}</div>
      <div class="resource">👕 {{ islandStatus.work_clothes }}</div>
      <div class="resource">👥 {{ islandStatus.pop_pioneers }}</div>
      <div class="tick-info">{{ logMessage }}</div>
      <button @click="handleTick">Force Tick</button>
    </div>

    <div class="map-grid">
      <div v-for="(row, y) in mapData" :key="y" class="map-row">
        <div 
          v-for="(cellType, x) in row" 
          :key="x" 
          class="map-cell" 
          :class="{ 'grass': cellType === 'grass', 'selected': selectedCell?.x === x && selectedCell?.y === y }"
          @click="handleCellClick(x, y)"
        >
          <span v-if="getBuildingAt(x, y)" class="building-icon">
            {{ getBuildingSymbol(getBuildingAt(x, y).type) }}
          </span>
        </div>
      </div>
    </div>

    <div v-if="selectedCell" class="build-menu">
      <h3>Build at [{{ selectedCell.x }}, {{ selectedCell.y }}]</h3>
      <div class="options">
        <button 
          v-for="b in buildMenu" 
          :key="b.type" 
          @click="buildStructure(b.type)"
          :disabled="coins < b.cost"
        >
          {{ b.name }} ({{ b.cost }})
        </button>
      </div>
      <button @click="selectedCell = null" style="background: #999">Cancel</button>
    </div>
  </div>
</template>

<style scoped>
.game-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.status-bar {
  background: #2c3e50;
  color: white;
  padding: 10px;
  display: flex;
  gap: 20px;
}
.map-grid {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: #8fbc8f; /* Sea color background */
}
.map-row {
  display: flex;
}
.map-cell {
  width: 40px;
  height: 40px;
  border: 1px solid rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background-color: #aed9e0; /* Water */
}
.map-cell.grass {
  background-color: #90ee90; /* Grass */
}
.map-cell.selected {
  border: 2px solid yellow;
  box-shadow: 0 0 10px yellow;
}
.map-cell:hover {
  filter: brightness(1.1);
}
.building-icon {
  font-size: 24px;
}
.build-menu {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  padding: 20px;
  border-top: 2px solid #ccc;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.2);
}
.options {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}
</style>