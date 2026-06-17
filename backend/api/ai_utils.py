import os
import logging
from google import genai
from google.genai.errors import APIError

logger = logging.getLogger(__name__)

def get_gemini_client():
    """Get Gemini client."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY environment variable is not configured.")
        return None
    try:
        return genai.Client(api_key=api_key)
    except Exception as e:
        logger.error(f"Failed to initialize Gemini Client: {e}")
        return None

def generate_seo_title(post_content):
    """Generate SEO title suggestion using Gemini."""
    client = get_gemini_client()
    if not client:
        return "Gemini API key not configured. Please add it to your backend/.env file."

    try:
        prompt = (
            "You are an SEO expert. Analyze the following content draft and recommend a single, "
            "highly engaging, search-engine-optimized, click-worthy article title. "
            "Return ONLY the plain title text. Do not include quotes, markdown formatting, introductory "
            "sentences, or notes.\n\n"
            f"Content:\n{post_content}"
        )

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        return response.text.strip()

    except APIError as e:
        logger.error(f"Gemini API Error in generate_seo_title: {e}")
        return f"AI Generation temporarily unavailable: {e.message}"
    except Exception as e:
        logger.error(f"Unexpected error in generate_seo_title: {e}")
        return "AI Generation failed due to an internal server error."

def summarize_comments(comments_list):
    """Summarize comments using Gemini."""
    client = get_gemini_client()
    if not client:
        return "Gemini API key not configured. Please add it to your backend/.env file."

    if not comments_list:
        return "No comments have been posted yet to summarize."

    try:
        comments_block = "\n".join([f"- {comment}" for comment in comments_list])
        
        prompt = (
            "You are a creator analyst. Review the following comments posted by readers. "
            "Summarize the general sentiment (Positive, Negative, or Mixed) in 1 sentence. "
            "Then, output exactly 3 bullet points representing the key feedback, questions, or requests "
            "the readers are making. Format the output clean and clear for the creator's dashboard.\n\n"
            f"Comments:\n{comments_block}"
        )

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        return response.text.strip()

    except APIError as e:
        logger.error(f"Gemini API Error in summarize_comments: {e}")
        return f"AI Comment analysis temporarily unavailable: {e.message}"
    except Exception as e:
        logger.error(f"Unexpected error in summarize_comments: {e}")
        return "AI Comment analysis failed due to an internal server error."
