import { APP_VERSION, PROJECT_FORMAT, PROJECT_FORMAT_VERSION } from "./config.js";
import { cloneObject } from "./utils.js";

export function createProject(story, options = {}) {
    const now = new Date().toISOString();
    return {
        format: PROJECT_FORMAT,
        formatVersion: PROJECT_FORMAT_VERSION,
        metadata: {
            id: options.id ?? crypto.randomUUID(),
            name: options.name ?? story?.projectName ?? "",
            author: options.author ?? "",
            createdAt: options.createdAt ?? now,
            updatedAt: options.updatedAt ?? now,
            applicationVersion: APP_VERSION
        },
        settings: {
            export: { target: "mapbox-scrollytelling" },
            storage: { provider: "local" }
        },
        story: cloneObject(story),
        assets: {
            images: [],
            models: [],
            icons: [],
            fonts: []
        }
    };
}

export function touchProject(project) {
    project.metadata.updatedAt = new Date().toISOString();
    project.metadata.name = project.story?.projectName ?? project.metadata.name ?? "";
    project.metadata.applicationVersion = APP_VERSION;
    return project;
}
