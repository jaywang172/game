<template>
  <div class="welcome" :style="{ backgroundImage: `url('/${backgroundImage}')` }">
    <div class="main-buttons">
      <button class="hs-button play-button" @click="goToBattle">PLAY</button>
      <button class="hs-button">SOLO ADVENTURES</button>
      <button class="hs-button">FRIENDS</button>
    </div>
    <!-- Options and other elements can be added later -->
  </div>
</template>

<script>
export default {
  name: 'WelcomeView',
  data() {
    return {
      backgroundImage: 'ChatGPT Image 2025年5月2日 下午09_26_45.png' // Updated filename
    };
  },
  methods: {
    goToBattle() {
      this.$router.push('/battle');
    }
  }
}
</script>

<style scoped>
.welcome {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 100vh;
  background-size: cover;
  background-position: center;
  padding: 20px;
}

.main-buttons {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 400px;
  width: 80%;
  margin: 0 auto;
  margin-top: 10vh;
}

.hs-button {
  padding: 15px 30px;
  font-size: 1.5em;
  font-weight: bold;
  color: #f0e0c0;
  background-color: #6b4f34;
  border: 3px solid #c8a868;
  border-radius: 10px;
  cursor: pointer;
  text-shadow: 1px 1px 3px rgba(0,0,0,0.7);
  width: 100%;
  text-align: center;
  box-sizing: border-box;
  transition: background-color 0.2s ease, transform 0.1s ease;
}

.hs-button:hover {
  background-color: #856442;
}

.hs-button:active {
    transform: scale(0.98);
}

.play-button {
  background-color: #8c4c1c;
  font-size: 2em;
  padding: 20px 40px;
  color: #fff5e0;
  border-color: #eac07a;
}
</style> 