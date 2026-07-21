export const defaultLocation = {
    center: [6.6323, 46.5197],
    zoom: 9,
    pitch: 0,
    bearing: 0
};

export const defaultStory = {
    projectName: "",
    title: "Mon premier Story",
    mapboxToken: "",
    mapStyle: "mapbox://styles/mapbox/standard",

    projectConfig: {
        location: { ...defaultLocation },
        layerOpacity: {},
        layerStyles: {},
        legend: [],
        layerTransition: { enabled: true, duration: 600, delay: 0 }
    },

    meta: {
        title: "Mon premier Story",
        dek: "Une introduction courte à votre récit.",
        authors: [
            { name: "", url: "", image: null, imageName: "" }
        ],
        footer: {
            signatures: "",
            sources: ""
        }
    },

    chapters: [
        {
            id: "intro",
            title: "Introduction",
            description: "Bienvenue dans cette histoire.",
            image: null,
            imageName: "",
            imageCaption: "",
            location: {
                center: [6.6323, 46.5197],
                zoom: 9,
                pitch: 0,
                bearing: 0
            },
            layerOpacity: {},
            layerStyles: {},
            legend: [],
            layerMode: "snapshot",
            layerTransition: { enabled: true, duration: 600, delay: 0 },
            transition: { control: "automatic", method: "flyTo", duration: 1200, smoothing: 0.18, essential: true, easing: "ease-in-out" }
        },
        {
            id: "chapitre-1",
            title: "Chapitre 1",
            description: "Premier chapitre.",
            image: null,
            imageName: "",
            imageCaption: "",
            location: {
                center: [7.4474, 46.948],
                zoom: 10,
                pitch: 25,
                bearing: 0
            },
            layerOpacity: {},
            layerStyles: {},
            legend: [],
            layerMode: "snapshot",
            layerTransition: { enabled: true, duration: 600, delay: 0 },
            transition: { control: "automatic", method: "flyTo", duration: 1200, smoothing: 0.18, essential: true, easing: "ease-in-out" }
        },
        {
            id: "chapitre-2",
            title: "Chapitre 2",
            description: "Deuxième chapitre.",
            image: null,
            imageName: "",
            imageCaption: "",
            location: {
                center: [8.5417, 47.3769],
                zoom: 10,
                pitch: 35,
                bearing: 0
            },
            layerOpacity: {},
            layerStyles: {},
            legend: [],
            layerMode: "snapshot",
            layerTransition: { enabled: true, duration: 600, delay: 0 },
            transition: { control: "automatic", method: "flyTo", duration: 1200, smoothing: 0.18, essential: true, easing: "ease-in-out" }
        }
    ]
};
