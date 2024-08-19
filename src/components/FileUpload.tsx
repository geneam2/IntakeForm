import React, { useState, ChangeEvent, FormEvent } from "react";

interface FileUploadProps {
  setData: (data: {
    policyNumber?: string;
    provider?: string;
    cardData?: string;
    mimeType?: string;
    status: string;
  }) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ setData }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const maxSizeInMB = 10;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      alert("Please select a file first!");
      return;
    }

    try {
      const fileSizeMb = Math.ceil((file.size / (1024 * 1024)) * 10) / 10;
      if (fileSizeMb > maxSizeInMB) {
        throw new Error(`File size ${fileSizeMb} MB exceeds 10 MB limit`);
      }
      const formData = new FormData();
      formData.append("cardImage", file);

      setLoading(true);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/claude/extractCardData`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorMessage = await response.json();
        throw new Error(errorMessage.error);
      }

      const result = await response.json();

      const data = {
        ...result,
        status: "File uploaded successfully.",
      };

      setData(data);
      setLoading(false);
    } catch (error) {
      setData({ status: `${error}` });
      setLoading(false);
    }
  };

  const renderData = (data: any) => {
    if (typeof data === "object" && data !== null) {
      return Object.keys(data).map((key) => (
        <div key={key} className="text-sm">
          <strong>{key}:</strong> {renderValue(data[key])}
        </div>
      ));
    }
    return <p className="text-sm">{data}</p>;
  };

  const renderValue = (value: any) => {
    if (typeof value === "object" && value !== null) {
      return renderData(value);
    }
    return <span>{String(value)}</span>;
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          onChange={handleFileChange}
          accept=".png, .jpeg, .jpg"
          required
        />
        {preview && (
          <img
            src={preview}
            alt="Preview"
            className="w-full mt-2 mb-2 rounded-md"
          />
        )}
        <button
          type="submit"
          className="h-8 bg-gray-500 hover:bg-gray-700 text-white font-semibold py-0 px-2 rounded focus:outline-none focus:shadow-outline"
        >
          Upload
        </button>
      </form>
      {loading && <p className="mt-2 text-gray-500">Loading...</p>}
    </div>
  );
};

export default FileUpload;
