import { GoogleGenAI } from "@google/genai";

const apiKey = "AIzaSyB_AJhr0G-RrxETsOSQyFH5ZvvQXsinsXs";

const ai = new GoogleGenAI({ apiKey });

async function listAllModels() {
    try {
        console.log("Listing models...");
        const response = await ai.models.list();
        // models is a pager, but it might be directly iterable if it implements AsyncIterable
        for await (const model of response) {
            console.log(`- ${model.name}`);
        }
    } catch (error) {
        console.error("Error listing models:", JSON.stringify(error, null, 2));
    }
}

listAllModels();
