'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { QuizWithQuestions } from '@/types';

type AnswerDraft = { option_text: string; is_correct: boolean; sort_order: number };
type QuestionDraft = {
  question_text: string;
  image_url: string | null;
  sort_order: number;
  answer_options: AnswerDraft[];
};

const OPTION_COLORS = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'];

function emptyQuestion(sort_order: number): QuestionDraft {
  return {
    question_text: '',
    image_url: null,
    sort_order,
    answer_options: [0, 1, 2, 3].map((i) => ({
      option_text: '',
      is_correct: i === 0,
      sort_order: i,
    })),
  };
}

interface Props {
  initial?: QuizWithQuestions;
}

export default function QuizEditor({ initial }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    initial?.questions.length
      ? initial.questions.map((q) => ({
          question_text: q.question_text ?? '',
          image_url: q.image_url,
          sort_order: q.sort_order,
          answer_options: q.answer_options.map((a) => ({
            option_text: a.option_text,
            is_correct: a.is_correct,
            sort_order: a.sort_order,
          })),
        }))
      : [emptyQuestion(0)],
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);

  function updateQuestion(idx: number, patch: Partial<QuestionDraft>) {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  }

  function updateAnswer(qIdx: number, aIdx: number, patch: Partial<AnswerDraft>) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        return {
          ...q,
          answer_options: q.answer_options.map((a, j) =>
            j === aIdx ? { ...a, ...patch } : a,
          ),
        };
      }),
    );
  }

  function toggleCorrect(qIdx: number, aIdx: number) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        return {
          ...q,
          answer_options: q.answer_options.map((a, j) =>
            j === aIdx ? { ...a, is_correct: !a.is_correct } : a,
          ),
        };
      }),
    );
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, emptyQuestion(prev.length)]);
  }

  function removeQuestion(idx: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, sort_order: i })));
  }

  async function uploadImage(idx: number, file: File) {
    setUploading(idx);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const { url } = await res.json();
    updateQuestion(idx, { image_url: url });
    setUploading(null);
  }

  async function save() {
    if (!title.trim()) return alert('Sisesta viktoriini pealkiri');
    for (const q of questions) {
      if (!q.question_text.trim() && !q.image_url) return alert('Küsimusel peab olema tekst või pilt');
      if (!q.answer_options.some((a) => a.is_correct)) return alert('Iga küsimusel peab olema vähemalt üks õige vastus');
    }
    setSaving(true);
    const method = initial ? 'PUT' : 'POST';
    const url = initial ? `/api/quizzes/${initial.id}` : '/api/quizzes';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, questions }),
    });
    setSaving(false);
    if (res.ok) router.push('/admin');
    else alert('Salvestamine ebaõnnestus');
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">{initial ? 'Muuda viktoriini' : 'Uus viktoriin'}</h1>

        <input
          className="w-full bg-gray-800 rounded-lg p-3 mb-8 text-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Viktoriini pealkiri"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {questions.map((q, qIdx) => (
          <div key={qIdx} className="bg-gray-800 rounded-xl p-5 mb-5">
            <div className="flex justify-between items-start mb-3">
              <span className="text-gray-400 text-sm font-semibold">Küsimus {qIdx + 1}</span>
              {questions.length > 1 && (
                <button onClick={() => removeQuestion(qIdx)} className="text-red-400 text-sm hover:text-red-300">
                  Kustuta
                </button>
              )}
            </div>

            <textarea
              className="w-full bg-gray-700 rounded-lg p-3 mb-3 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Küsimuse tekst (jäta tühjaks kui kasutad ainult pilti)"
              rows={2}
              value={q.question_text}
              onChange={(e) => updateQuestion(qIdx, { question_text: e.target.value })}
            />

            <div className="mb-4">
              {q.image_url && (
                <div className="relative mb-2">
                  <Image
                    src={q.image_url}
                    alt="Küsimuse pilt"
                    width={400}
                    height={200}
                    className="rounded-lg max-h-48 object-contain"
                  />
                  <button
                    onClick={() => updateQuestion(qIdx, { image_url: null })}
                    className="absolute top-1 right-1 bg-black/60 rounded px-2 py-0.5 text-xs"
                  >
                    Eemalda
                  </button>
                </div>
              )}
              <label className="text-sm text-gray-400 cursor-pointer hover:text-purple-400">
                {uploading === qIdx ? 'Laadin üles...' : '+ Lisa pilt'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading !== null}
                  onChange={(e) => e.target.files?.[0] && uploadImage(qIdx, e.target.files[0])}
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {q.answer_options.map((a, aIdx) => (
                <div
                  key={aIdx}
                  className={`${OPTION_COLORS[aIdx]} rounded-lg overflow-hidden ${a.is_correct ? 'ring-4 ring-white' : 'opacity-60'}`}
                >
                  <input
                    className="w-full bg-transparent placeholder-white/70 text-white focus:outline-none font-semibold px-3 pt-3 pb-1"
                    placeholder={`Vastus ${aIdx + 1}`}
                    value={a.option_text}
                    onChange={(e) => updateAnswer(qIdx, aIdx, { option_text: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => toggleCorrect(qIdx, aIdx)}
                    className="w-full flex items-center gap-1.5 px-3 pb-2 pt-1 text-xs text-white/80 hover:text-white"
                  >
                    <div className={`w-3.5 h-3.5 rounded-sm border-2 border-white/80 flex items-center justify-center flex-shrink-0 ${a.is_correct ? 'bg-white' : ''}`}>
                      {a.is_correct && <span className="text-gray-900 font-black leading-none" style={{ fontSize: 9 }}>✓</span>}
                    </div>
                    {a.is_correct ? 'Õige vastus' : 'Märgi õigeks'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        <button
          onClick={addQuestion}
          className="w-full border-2 border-dashed border-gray-600 rounded-xl py-3 text-gray-400 hover:border-purple-500 hover:text-purple-400 mb-6"
        >
          + Lisa küsimus
        </button>

        <div className="flex gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-6 py-3 rounded-xl font-bold text-lg flex-1"
          >
            {saving ? 'Salvestan...' : 'Salvesta viktoriin'}
          </button>
          <button
            onClick={() => router.push('/admin')}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-xl"
          >
            Tühista
          </button>
        </div>
      </div>
    </div>
  );
}
