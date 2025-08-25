import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { env } from 'hono/adapter';
import Docker from 'dockerode';

const app = new Hono();

let docker: Docker;

app.use('*', async (c, next) => {
  if (!docker) {
    const { DOCKER_SOCKET_PATH } = env<{ DOCKER_SOCKET_PATH?: string }>(c);
    const dockerSocketPath = DOCKER_SOCKET_PATH || '/var/run/docker.sock';
    
    docker = new Docker({ socketPath: dockerSocketPath });
  }
  await next();
});

app.use('/*', cors());

// Get all containers
app.get('/api/containers', async (c) => {
  try {
    const containers = await docker.listContainers({ all: true });
    const containerDetails = containers.map(container => ({
      id: container.Id,
      names: container.Names,
      image: container.Image,
      state: container.State,
      status: container.Status,
      created: container.Created,
      size: (container as any).SizeRw || 0,
    }));
    return c.json(containerDetails);
  } catch (error) {
    return c.json({ error: 'Failed to fetch containers' }, 500);
  }
});

// Get all images
app.get('/api/images', async (c) => {
  try {
    const images = await docker.listImages({ all: true });
    const imageDetails = images.map(image => ({
      id: image.Id,
      repoTags: image.RepoTags || [],
      created: image.Created,
      size: image.Size,
      virtualSize: image.VirtualSize,
      containers: image.Containers,
    }));
    return c.json(imageDetails);
  } catch (error) {
    return c.json({ error: 'Failed to fetch images' }, 500);
  }
});

// Get all volumes
app.get('/api/volumes', async (c) => {
  try {
    const volumesData = await docker.listVolumes();
    
    // Get volume sizes from docker.df() which includes size information
    const df = await docker.df();
    const volumeSizes = new Map();
    
    if (df.Volumes) {
      df.Volumes.forEach((vol: any) => {
        volumeSizes.set(vol.Name, vol.UsageData?.Size || 0);
      });
    }
    
    const volumeDetails = volumesData.Volumes.map(volume => ({
      name: volume.Name,
      driver: volume.Driver,
      mountpoint: volume.Mountpoint,
      created: (volume as any).CreatedAt,
      size: volumeSizes.get(volume.Name) || 0,
      refCount: volume.UsageData?.RefCount || 0,
    }));
    
    return c.json(volumeDetails);
  } catch (error) {
    return c.json({ error: 'Failed to fetch volumes' }, 500);
  }
});

// Get all networks
app.get('/api/networks', async (c) => {
  try {
    const networks = await docker.listNetworks();
    const networkDetails = networks.map(network => ({
      id: network.Id,
      name: network.Name,
      driver: network.Driver,
      scope: network.Scope,
      internal: network.Internal,
      created: network.Created,
    }));
    return c.json(networkDetails);
  } catch (error) {
    return c.json({ error: 'Failed to fetch networks' }, 500);
  }
});

// Delete containers
app.delete('/api/containers', async (c) => {
  try {
    const { ids } = await c.req.json();
    const results: any[] = [];
    
    for (const id of ids) {
      try {
        const container = docker.getContainer(id);
        await container.remove({ force: true });
        results.push({ id, success: true });
      } catch (error) {
        results.push({ id, success: false, error: (error as Error).message });
      }
    }
    
    return c.json({ results });
  } catch (error) {
    return c.json({ error: 'Failed to delete containers' }, 500);
  }
});

// Delete images
app.delete('/api/images', async (c) => {
  try {
    const { ids } = await c.req.json();
    const results: any[] = [];
    
    for (const id of ids) {
      try {
        const image = docker.getImage(id);
        await image.remove({ force: true });
        results.push({ id, success: true });
      } catch (error) {
        results.push({ id, success: false, error: (error as Error).message });
      }
    }
    
    return c.json({ results });
  } catch (error) {
    return c.json({ error: 'Failed to delete images' }, 500);
  }
});

// Delete volumes
app.delete('/api/volumes', async (c) => {
  try {
    const { names } = await c.req.json();
    const results: any[] = [];
    
    for (const name of names) {
      try {
        const volume = docker.getVolume(name);
        await volume.remove({ force: true });
        results.push({ name, success: true });
      } catch (error) {
        results.push({ name, success: false, error: (error as Error).message });
      }
    }
    
    return c.json({ results });
  } catch (error) {
    return c.json({ error: 'Failed to delete volumes' }, 500);
  }
});

// Delete networks
app.delete('/api/networks', async (c) => {
  try {
    const { ids } = await c.req.json();
    const results: any[] = [];
    
    for (const id of ids) {
      try {
        const network = docker.getNetwork(id);
        await network.remove();
        results.push({ id, success: true });
      } catch (error) {
        results.push({ id, success: false, error: (error as Error).message });
      }
    }
    
    return c.json({ results });
  } catch (error) {
    return c.json({ error: 'Failed to delete networks' }, 500);
  }
});

// Get system info and disk usage
app.get('/api/system', async (c) => {
  try {
    const df = await docker.df();
    return c.json({
      images: {
        count: df.Images?.length || 0,
        size: df.Images?.reduce((acc: number, img: any) => acc + (img.Size || 0), 0) || 0,
      },
      containers: {
        count: df.Containers?.length || 0,
        size: df.Containers?.reduce((acc: number, cont: any) => acc + (cont.SizeRw || 0), 0) || 0,
      },
      volumes: {
        count: df.Volumes?.length || 0,
        size: df.Volumes?.reduce((acc: number, vol: any) => acc + (vol.UsageData?.Size || 0), 0) || 0,
      },
    });
  } catch (error) {
    return c.json({ error: 'Failed to fetch system info' }, 500);
  }
});

const port = 3001;
console.log(`Server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
