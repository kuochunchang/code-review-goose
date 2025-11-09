<template>
  <v-container fluid class="fill-height">
    <v-row align="center" justify="center">
      <v-col cols="12" md="8" lg="6">
        <v-card class="text-center pa-8">
          <v-card-title class="mb-4">
            <pre class="ascii-art">  _____  ____   ____   _____ ______
 / ____|/ __ \ / __ \ / ____|  ____|
| |  __| |  | | |  | | (___ | |__
| | |_ | |  | | |  | |\___ \|  __|
| |__| | |__| | |__| |____) | |____
 \_____|\____/ \____/|_____/|______|</pre>
          </v-card-title>
          <v-card-text>
            <p class="text-body-1 text-grey">
              Project Path: {{ projectInfo?.path || 'Loading...' }}
            </p>
          </v-card-text>
          <v-card-actions class="justify-center">
            <v-btn color="primary" size="large" @click="loadProject">
              Start Review
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useProjectStore } from '../stores/project';

const router = useRouter();
const projectStore = useProjectStore();
const projectInfo = ref<any>(null);

onMounted(async () => {
  try {
    projectInfo.value = await projectStore.fetchProjectInfo();
  } catch (error) {
    console.error('Failed to load project info:', error);
  }
});

const loadProject = () => {
  router.push('/review');
};
</script>

<style scoped>
.fill-height {
  min-height: 100vh;
}

.ascii-art {
  font-family: 'Courier New', Courier, monospace;
  font-size: 1.2rem;
  line-height: 1.2;
  color: #1976d2;
  margin: 0 auto;
  display: inline-block;
  text-align: left;
}
</style>
