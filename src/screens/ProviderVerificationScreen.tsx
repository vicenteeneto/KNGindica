import React, { useState } from 'react';
import { NavigationProps } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';

export default function ProviderVerificationScreen({ onNavigate }: NavigationProps) {
  const { user } = useAuth();
  const [frontDoc, setFrontDoc] = useState<File | null>(null);
  const [backDoc, setBackDoc] = useState<File | null>(null);
  const [proofOfResidence, setProofOfResidence] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const uploadFile = async (file: File, suffix: string) => {
    if (!user) return null;
    const fileExt = file.name.split('.').pop();
    const filePath = `verifications/${user.id}/${suffix}_${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('verifications')
      .upload(filePath, file);

    if (uploadError) throw uploadError;
    return filePath;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !frontDoc || !backDoc || !proofOfResidence || !selfie) return;

    setIsSubmitting(true);
    try {
      // 1. Upload all files parallel
      const [frontPath, backPath, selfiePath, residencePath] = await Promise.all([
        uploadFile(frontDoc, 'front'),
        uploadFile(backDoc, 'back'),
        uploadFile(selfie, 'selfie'),
        uploadFile(proofOfResidence, 'residence')
      ]);

      // 2. Insert into DB
      const { error: dbError } = await supabase
        .from('provider_verifications')
        .upsert({
          provider_id: user.id,
          document_front_path: frontPath,
          document_back_path: backPath,
          selfie_path: selfiePath,
          residence_proof_path: residencePath,
          status: 'pending'
        }, { onConflict: 'provider_id' });

      if (dbError) throw dbError;

      setSubmitted(true);
    } catch (err: any) {
      alert("Erro ao enviar documentos: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const FileInput = ({
    label,
    value,
    onChange,
    icon
  }: {
    label: string,
    value: File | null,
    onChange: (f: File | null) => void,
    icon: string
  }) => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    return (
      <div 
        className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" 
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden" 
          accept="image/*,.pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onChange(file);
          }}
        />
        {value ? (
          <>
            <div className="size-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center mb-2">
              <span className="material-symbols-outlined text-2xl">check_circle</span>
            </div>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Arquivo Selecionado</p>
            <p className="text-xs text-slate-500 truncate max-w-full px-4">{value.name}</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="mt-2 text-xs font-semibold text-red-500 hover:text-red-600"
            >
              Remover
            </button>
          </>
        ) : (
          <>
            <div className="size-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mb-2">
              <span className="material-symbols-outlined text-2xl">{icon}</span>
            </div>
            <p className="text-sm font-semibold">{label}</p>
            <p className="text-xs text-slate-500">Clique para selecionar</p>
            <p className="text-[10px] text-slate-400 mt-1">JPG, PNG ou PDF (Máx. 5MB)</p>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 font-display text-slate-900 dark:text-slate-100 antialiased overflow-hidden">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 h-16 flex items-center shadow-sm">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center justify-center size-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-900 dark:text-white"
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
        <h1 className="font-bold text-lg ml-2 flex-1 text-slate-900 dark:text-white">Verificação de Identidade</h1>
        <button
          onClick={() => onNavigate('dashboard')}
          className="text-sm font-bold text-primary hover:underline px-2"
        >
          Sair
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full p-4 pb-24">
        <div className="max-w-xl mx-auto space-y-6">

          {submitted ? (
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 text-center flex flex-col items-center gap-4 mt-8">
              <div className="size-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl">hourglass_empty</span>
              </div>
              <h2 className="text-2xl font-bold">Documentos em Análise!</h2>
              <p className="text-slate-500 dark:text-slate-400">
                Recebemos sua documentação. Nossa equipe fará a validação em até 48 horas úteis.
                Assim que aprovada, você receberá o <strong>Selo de Profissional Verificado</strong>.
              </p>
              <button
                onClick={() => onNavigate('dashboard')}
                className="mt-4 w-full bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
              >
                Voltar ao Painel
              </button>
            </div>
          ) : (
            <>
              {/* Info Alert */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-xl flex gap-3 items-start">
                <span className="material-symbols-outlined text-blue-500 mt-0.5">info</span>
                <div>
                  <h3 className="font-bold text-blue-900 dark:text-blue-100 text-sm">Por que enviar documentos?</h3>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Profissionais verificados ganham um selo de confiança, aparecem no topo das buscas e fecham até 3x mais serviços. Seus dados estão seguros.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Document Type */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg">Documento de Identidade (RG ou CNH)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FileInput
                      label="Frente do Documento"
                      value={frontDoc}
                      onChange={setFrontDoc}
                      icon="id_card"
                    />
                    <FileInput
                      label="Verso do Documento"
                      value={backDoc}
                      onChange={setBackDoc}
                      icon="credit_card"
                    />
                  </div>
                </div>

                <hr className="border-slate-200 dark:border-slate-800" />

                <div className="space-y-4">
                  <h3 className="font-bold text-lg">Selfie com Documento</h3>
                  <p className="text-sm text-slate-500 -mt-2">Tire uma foto do seu rosto segurando o documento enviado acima, próximo ao queixo.</p>
                  <FileInput
                    label="Enviar Selfie"
                    value={selfie}
                    onChange={setSelfie}
                    icon="face"
                  />
                </div>

                <hr className="border-slate-200 dark:border-slate-800" />

                <div className="space-y-4">
                  <h3 className="font-bold text-lg">Comprovante de Residência</h3>
                  <p className="text-sm text-slate-500 -mt-2">Conta de luz, água ou fatura de cartão (máximo 3 meses).</p>
                  <FileInput
                    label="Enviar Comprovante"
                    value={proofOfResidence}
                    onChange={setProofOfResidence}
                    icon="home"
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={!frontDoc || !backDoc || !proofOfResidence || !selfie || isSubmitting}
                    className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="material-symbols-outlined animate-spin">progress_activity</span>
                        Enviando...
                      </>
                    ) : (
                      'Enviar para Análise'
                    )}
                  </button>
                </div>
              </form>
            </>
          )}

        </div>
      </main>
    </div>
  );
}
