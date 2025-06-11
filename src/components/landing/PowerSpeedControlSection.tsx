
import { Megaphone, GraduationCap, Laptop2, Building, Mic, CalendarClock } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { FeatureCard } from '@/components/ui/grid-feature-cards';

const personas = [
	{
		title: 'Marketers',
		icon: Megaphone,
		description: 'Run webinars and need clean, instant analytics',
	},
	{
		title: 'Educators & Trainers',
		icon: GraduationCap,
		description: 'Measure engagement and learning outcomes',
	},
	{
		title: 'SaaS Teams',
		icon: Laptop2,
		description: 'Onboarding, demos, and community growth via Zoom',
	},
	{
		title: 'Agencies',
		icon: Building,
		description: 'Manage events for multiple clients and need clean reporting',
	},
	{
		title: 'Consultants & Coaches',
		icon: Mic,
		description: 'Host knowledge sessions and prove their value',
	},
	{
		title: 'Event Planners',
		icon: CalendarClock,
		description: 'Deliver clean post-event data to sponsors and stakeholders',
	},
];

export const PowerSpeedControlSection = () => {
	return (
		<section className="py-20 md:py-36 bg-background">
			<div className="mx-auto w-full max-w-6xl space-y-12 px-4">
				<AnimatedContainer className="mx-auto max-w-3xl text-center">
					<h2 className="text-3xl font-bold tracking-wide text-balance md:text-4xl lg:text-5xl xl:font-extrabold">
						Who's It For?
					</h2>
					<p className="text-muted-foreground mt-4 text-sm tracking-wide text-balance md:text-base">
						Built for teams who need actionable webinar insights.
					</p>
				</AnimatedContainer>

				<AnimatedContainer
					delay={0.4}
					className="grid grid-cols-1 divide-x divide-y divide-dashed border border-dashed sm:grid-cols-2 md:grid-cols-3 gap-0"
				>
					{personas.map((persona, i) => (
						<FeatureCard key={i} feature={persona} />
					))}
				</AnimatedContainer>
			</div>
		</section>
	);
};

type ViewAnimationProps = {
	delay?: number;
	className?: React.ComponentProps<typeof motion.div>['className'];
	children: React.ReactNode;
};

function AnimatedContainer({ className, delay = 0.1, children }: ViewAnimationProps) {
	const shouldReduceMotion = useReducedMotion();

	if (shouldReduceMotion) {
		return <div className={className}>{children}</div>;
	}

	return (
		<motion.div
			initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
			whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
			viewport={{ once: true }}
			transition={{ delay, duration: 0.8 }}
			className={className}
		>
			{children}
		</motion.div>
	);
}
