import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";

interface UploadResponse {
  status: "success" | "error";
  message: string;
  data?: {
    originalName: string;
    fileSize: number;
    chunksCreated: number;
    processedAt: string;
    pdfID: string;
    jobId: string;
  };
  code?: string;
  error?: string;
}

export default function PDFUploader() {
  const navigate = useNavigate();

  const [pdfId, setPdfId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<UploadResponse | null>(null);
  const [jobStatus, setJobStatus] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        setResponse(null); // Clear previous response
      } else {
        setResponse({
          status: "error",
          message: "Please select a valid PDF file",
          code: "INVALID_FILE_TYPE",
        });
        setFile(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setResponse({
        status: "error",
        message: "Please select a PDF file first",
        code: "NO_FILE_SELECTED",
      });
      return;
    }

    setLoading(true);
    setResponse(null);

    try {
      const formData = new FormData();
      formData.append("pdf", file);

      const res = await fetch("http://localhost:5000/api/upload", {
        method: "POST",
        body: formData,
      });

      const result: UploadResponse = await res.json();
      setResponse(result);

      if (result && result.data && result.data.jobId) {
      const stat = await fetch(
        `http://localhost:5000/api/job-status/${result.data.jobId}`,
        {
          method: "GET",
        }
      );
      const job_status = await stat.json();
      setJobStatus(job_status);
    } else {
      console.log("No job ID received from upload");
    }

      // Reset form on success
      if (result.status === "success") {
        setFile(null);
        // Reset file input
        const fileInput = document.getElementById("file") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      }
    } catch (error) {
      setResponse({
        status: "error",
        message: "Failed to connect to server. Please try again.",
        code: "NETWORK_ERROR",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setResponse(null);
    const fileInput = document.getElementById("file") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleRefresh = async () => {
    if (response && response.data && response.data.jobId) {
      const stat = await fetch(
        `http://localhost:5000/api/job-status/${response.data.jobId}`,
        {
          method: "GET",
        }
      );
      const job_status = await stat.json();
      setJobStatus(job_status);
    } else {
      console.log("No job ID received from upload");
    }

    setShowDetails(true);
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="file">Upload the PDF File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  disabled={loading}
                />

                {file && (
                  <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    <p>
                      <strong>Selected:</strong> {file.name}
                    </p>
                    <p>
                      <strong>Size:</strong>{" "}
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={!file || loading}
                >
                  {loading ? "Processing..." : "Upload & Process"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={loading}
                >
                  Reset
                </Button>
              </div>
            </div>
          </form>

          {/* Response Display */}
          {response && jobStatus && (
            <div className="mt-4">
              <Alert
                className={
                  response.status === "success"
                    ? "border-green-200 bg-green-50"
                    : "border-red-200 bg-red-50"
                }
              >
                <AlertDescription>
                  <div
                    className={
                      response.status === "success"
                        ? "text-green-800 w-full"
                        : "text-red-800"
                    }
                  >
                    <p className="font-semibold">
                      {jobStatus.data?.status === "completed"
                        ? `✅ ${response.message}`
                        : "❌ Processing..."}
                    </p>
                    <p className="text-xs mt-1">(Please refresh to get the status)</p>

                    {response.data && jobStatus?.data && (
                      <div className="mt-2 text-sm space-y-1">
                        <Button onClick={handleRefresh}>Refresh</Button>

                        <p>Job Status: {jobStatus.data.status}</p>
                        <p>PDF ID: {jobStatus.data.result?.pdfID}</p>
                        <p>File: {response.data.originalName}</p>
                        <p>Chunks Created: {jobStatus.data.result?.chunksCreated}</p>
                        <p>
                          Processed on:{" "}
                          {new Date(
                            jobStatus.data.result?.processedAt
                          ).toLocaleString()}
                        </p>

                        <div className="flex w-full max-w-sm items-center gap-2">
                          <Input
                            type="text"
                            placeholder="Enter the PDF ID"
                            value={pdfId}
                            onChange={(e) => setPdfId(e.target.value)}
                          />
                          <Button
                            onClick={() => navigate(`/chat/${pdfId}`)}
                            // Disable if empty or whitespace
                            disabled={!pdfId.trim()}
                          >
                            Chat with BOT
                          </Button>
                        </div>
                      </div>
                    )}

                    {response.error && (
                      <p className="text-xs mt-1 text-red-600">
                        Technical: {response.error}
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
