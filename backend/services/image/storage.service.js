import { createClient } from "@supabase/supabase-js";

export const ImageBuckets = {
    OffenseReport: "offense-reports",
    Suspect: "suspect-avatars",
    Evidence: "evidence",
}


export class StorageService {
   static async uploadImage(image, bucket, file_path) {
        if (!image) {
            throw new Error("Image is required.");
        }

        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );

        const { data : uploadData, error } = await supabase.storage.from(bucket).upload(file_path , image)
        if (error) {
            console.error("Error uploading image:", error);
            throw new Error("Error uploading image.");
        } else {
            console.log("Image uploaded successfully.", uploadData.path);
            return uploadData.fullPath;
        }

        
    }
}