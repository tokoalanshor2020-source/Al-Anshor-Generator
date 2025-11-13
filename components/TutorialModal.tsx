import React, { useEffect } from 'react';
import { useLocalization } from '../i18n';
import { XCircleIcon } from './icons/XCircleIcon';
import { RocketIcon } from './icons/RocketIcon';
import { PencilSquareIcon } from './icons/PencilSquareIcon';
import { FilmIcon } from './icons/FilmIcon';
import { ShoppingCartIcon } from './icons/ShoppingCartIcon';
import { SpeakerWaveIcon } from './icons/SpeakerWaveIcon';
import { PhotoIcon } from './icons/PhotoIcon';

interface TutorialModalProps {
    onClose: () => void;
}

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="border-t border-base-300 pt-4 mt-4">
        <h3 className="text-xl font-bold text-amber-300 flex items-center gap-3">
            {icon}
            {title}
        </h3>
        <div className="mt-3 text-gray-300/90 text-sm space-y-2 prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1">
            {children}
        </div>
    </div>
);

export const TutorialModal: React.FC<TutorialModalProps> = ({ onClose }) => {
    const { t } = useLocalization();
    const tutorial = t('tutorial') as any;
    const workflow1 = tutorial.workflow1 as any;
    const workflow2 = tutorial.workflow2 as any;
    const workflow3 = tutorial.workflow3 as any;
    const workflow4 = tutorial.workflow4 as any;
    const workflow5 = tutorial.workflow5 as any;

    useEffect(() => {
        document.body.classList.add('modal-open');
        return () => {
            document.body.classList.remove('modal-open');
        };
    }, []);


    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-base-200 rounded-2xl shadow-2xl w-full max-w-3xl border border-base-300 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-base-300 flex-shrink-0">
                    <h2 className="text-2xl font-bold text-gray-100">{tutorial.title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <XCircleIcon className="h-6 w-6" />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                    <p className="text-gray-400">{tutorial.intro}</p>
                    
                    <Section title={workflow1.title} icon={<PencilSquareIcon className="h-6 w-6 text-amber-300" />}>
                        <p>{workflow1.intro}</p>
                        <ul>
                            <li dangerouslySetInnerHTML={{ __html: workflow1.step1 }} />
                            <li dangerouslySetInnerHTML={{ __html: workflow1.step2 }} />
                            <li dangerouslySetInnerHTML={{ __html: workflow1.step3 }} />
                            <li dangerouslySetInnerHTML={{ __html: workflow1.step4 }} />
                        </ul>
                    </Section>

                    <Section title={workflow2.title} icon={<FilmIcon className="h-6 w-6 text-amber-300" />}>
                        <p>{workflow2.intro}</p>
                        <ul>
                            <li dangerouslySetInnerHTML={{ __html: workflow2.step1 }} />
                            <li dangerouslySetInnerHTML={{ __html: workflow2.step2 }} />
                            <li dangerouslySetInnerHTML={{ __html: workflow2.step3 }} />
                        </ul>
                    </Section>

                     <Section title={workflow3.title} icon={<ShoppingCartIcon className="h-6 w-6 text-amber-300" />}>
                        <p>{workflow3.intro}</p>
                        <ul>
                             <li dangerouslySetInnerHTML={{ __html: workflow3.step1 }} />
                             <li dangerouslySetInnerHTML={{ __html: workflow3.step2 }} />
                             <li dangerouslySetInnerHTML={{ __html: workflow3.step3 }} />
                             <li dangerouslySetInnerHTML={{ __html: workflow3.step4 }} />
                        </ul>
                    </Section>

                    <Section title={workflow4.title} icon={<SpeakerWaveIcon className="h-6 w-6 text-amber-300" />}>
                        <p>{workflow4.intro}</p>
                        <ul>
                             <li dangerouslySetInnerHTML={{ __html: workflow4.step1 }} />
                             <li dangerouslySetInnerHTML={{ __html: workflow4.step2 }} />
                             <li dangerouslySetInnerHTML={{ __html: workflow4.step3 }} />
                             <li dangerouslySetInnerHTML={{ __html: workflow4.step4 }} />
                        </ul>
                    </Section>

                    <Section title={workflow5.title} icon={<PhotoIcon className="h-6 w-6 text-amber-300" />}>
                        <p>{workflow5.intro}</p>
                        <ul>
                             <li dangerouslySetInnerHTML={{ __html: workflow5.step1 }} />
                             <li dangerouslySetInnerHTML={{ __html: workflow5.step2 }} />
                             <li dangerouslySetInnerHTML={{ __html: workflow5.step3 }} />
                             <li dangerouslySetInnerHTML={{ __html: workflow5.step4 }} />
                        </ul>
                    </Section>
                </div>

                <div className="flex-shrink-0 p-4 mt-auto border-t border-base-300 text-right">
                    <button onClick={onClose} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark">
                        {tutorial.closeButton}
                    </button>
                </div>
            </div>
        </div>
    );
};