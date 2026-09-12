// ===================================================
// Gemini API 호출을 위한 Vercel 서버리스 함수
// 
// Gemini 모델 gemini-3.6-flash 모델을 사용합니다.
// Vercel 환경 변수 GEMINI_API_KEY를 등록해야 정상 작동합니다.
// ===================================================

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Content-Type'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }

  const { memoText } = req.body || {};

  if (!memoText) {
    return res.status(400).json({ error: '메모 내용(memoText)이 필요합니다.' });
  }

  // Vercel 환경 변수에서 API 키 추출
  const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'Gemini API 키가 설정되지 않았습니다. Vercel 환경 변수에 GEMINI_API_KEY를 등록해 주세요.'
    });
  }

  try {
    // 개인식별 정보(이름, UID 등) 없이 순수 메모 내용만 프롬프트에 전달합니다.
    const prompt = `당신은 따뜻하고 격려를 잘하는 선생님입니다. 학생이 학급 담벼락에 적은 글을 보고 긍정적이고 응원하는 짧은 피드백 코멘트를 1~2문장으로 남겨주세요.\n\n학생 게시글: "${memoText}"`;

    // Gemini 모델: gemini-3.6-flash 호출
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API 호출 에러:', data);
      return res.status(response.status).json({
        error: data.error?.message || 'Gemini API 호출 중 오류가 발생했습니다.'
      });
    }

    const aiComment = data.candidates?.[0]?.content?.parts?.[0]?.text || '멋진 소감이네요!';

    return res.status(200).json({ comment: aiComment.trim() });
  } catch (error) {
    console.error('서버 오류 발생:', error);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
}
