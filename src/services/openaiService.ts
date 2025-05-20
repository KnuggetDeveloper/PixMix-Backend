import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Filter prompt mapping
const filterPrompts: Record<string, string> = {
  Ghibli:
    "Transform this image into a whimsical Studio Ghibli-style anime artwork with soft colors, gentle details, and the characteristic Ghibli charm.",
  Pixar:
    "Edit this image to look like a 3D Pixar-style animated character with expressive features, vibrant colors, and the signature Pixar lighting and texture.",
  Sketch:
    "Convert this image into a detailed pencil sketch with artistic shading and fine line work, as if it was hand-drawn by a skilled artist.",
  Cyberpunk:
    "Transform this image into a cyberpunk-themed version with neon lights, futuristic tech elements, urban dystopian vibes, and a moody, high-contrast color palette.",
};

/**
 * Process an image with OpenAI's API based on the selected filter
 *
 * @param imagePath Path to the local image file
 * @param filter Filter type to apply
 * @returns Path to the processed image file
 */
export async function processImageWithAI(
  imagePath: string,
  filter: string
): Promise<string> {
  try {
    // Ensure the image exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    // Get prompt for the selected filter
    const prompt =
      filterPrompts[filter] ||
      "Edit this image in a creative, artistic style while maintaining the main subject's recognizable features.";

    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, "../../processed");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create a unique filename for the output
    const outputPath = path.join(
      outputDir,
      `${Date.now()}-${uuidv4()}${path.extname(imagePath)}`
    );

    // Call OpenAI API
    const response = await openai.images.edit({
      model: "gpt-image-1",
      image: fs.createReadStream(imagePath),
      prompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json",
    });

    // Save the image
    if (response.data?.[0]?.b64_json) {
      const imageBuffer = Buffer.from(response.data[0].b64_json, "base64");
      await fs.promises.writeFile(outputPath, imageBuffer);
      return outputPath;
    } else {
      throw new Error("No image data in OpenAI response");
    }
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw error;
  }
}
