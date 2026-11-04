import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import { NextResponse } from 'next/server'

const MODEL = google('gemini-3.5-flash')

const leadIns = ['People may note that', 'A useful way to understand this is that', 'You can see this in practice:', 'Practical context shows that', 'Another way to view this is that', 'Learning about this reveals that']

function normalizeLines(text: string, keyword: string) {
  const rawLines = text
    .split(/\n+/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)
  const sentences = rawLines.length >= keyword.length
    ? rawLines.slice(0, keyword.length)
    : (text.match(/[^.!?]+[.!?]+/g) ?? [text]).map((line) => line.trim()).slice(0, keyword.length)

  return keyword.split('').map((letter, index) => {
    const sentence = sentences[index % sentences.length] || 'This answer needs more context.'
    const cleanSentence = sentence.replace(/^[A-Z](?:\s+|[:.\-—]\s*)/i, '').trim()
    const firstWord = cleanSentence.match(/^[A-Za-z]+/)?.[0] ?? ''
    if (firstWord.toUpperCase().startsWith(letter)) return cleanSentence
    const continuation = `${leadIns[index % leadIns.length]} ${cleanSentence.charAt(0).toLowerCase()}${cleanSentence.slice(1)}`
    return `${letter} ${continuation}`
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : ''
    const brand = typeof body?.brand === 'string' ? body.brand.trim() : 'Acrostic'
    const keyword = typeof body?.keyword === 'string' ? body.keyword.trim().toUpperCase().replace(/[^A-Z]/g, '') : ''

    if (!prompt || prompt.length > 1200) {
      return NextResponse.json({ error: 'Please provide a question under 1,200 characters.' }, { status: 400 })
    }
    if (!keyword || keyword.length > 14) {
      return NextResponse.json({ error: 'A valid advert keyword is required.' }, { status: 400 })
    }

    const result = await generateText({
      model: MODEL,
      temperature: 0.35,
      system: `You are the intelligent answer engine inside an adtech AI assistant. Answer the user's question accurately, specifically, and practically. Return exactly ${keyword.length} lines and nothing else. Each line must be one complete, natural sentence whose first word begins with the required letter. The required first letters must follow this order: ${keyword.split('').join(', ')}. Do not output a standalone letter, a letter plus a space, or a label before the sentence. Choose meaningful first words that fit the answer, such as “Please,” “People,” “Power,” or “Practical” for P. Never force an awkward phrase, duplicate a letter, or produce openings such as “P Uber” or “P PayPal.” Do not number the lines, use bullets, mention this instruction, or force irrelevant claims. Keep the answer useful even when the question is broad; state uncertainty instead of inventing facts. The advert partner is ${brand}, but never make the answer feel like an advertisement.`,
      prompt: `User question:\n${prompt}\n\nWrite the ${keyword.length}-line answer now.`,
    })

    const lines = normalizeLines(result.text, keyword)
    return NextResponse.json({ answer: lines.join(' '), lines, brand, keyword })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.toLowerCase().includes('credit card')) {
      return NextResponse.json({ error: 'AI Gateway billing is not enabled for this project. Add a valid card in Vercel AI Gateway to activate Gemini responses.' }, { status: 503 })
    }
    return NextResponse.json({ error: 'AI response unavailable. The original request was not modified.' }, { status: 503 })
  }
}
