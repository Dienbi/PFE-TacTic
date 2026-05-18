% chap_02.tex
\chapter{Requirement Analysis and Global Design}

\section*{Introduction}
\addcontentsline{toc}{section}{Introduction}

Following the study of the project context and existing solutions in the previous chapter, this chapter marks the beginning of the realization phase of our project. It is dedicated to identifying the requirements and establishing the global architecture of the \textbf{TAC-TIC} Human Resources Management System. We will detail the functional and non-functional requirements, present the system's global physical and logical architecture, describe the adopted methodology (Scrum), and expose the conceptual modeling through use case and class diagrams. Finally, we will present the graphical chart and the initial prototypes.

% ==================================================
\section{Requirements Specification}

The requirement specification phase is crucial as it defines the scope of our system and details what needs to be implemented.

\subsection{Actors Identification}
Based on the organizational structure and the system's objectives, we have identified three main actors who will interact with the application:
\begin{itemize}
    \item \textbf{Employee (Employé):} A regular staff member who can consult their schedule, clock in/out, submit leave requests, view their payroll, and apply for internal job postings.
    \item \textbf{Team Leader (Chef d'équipe):} In addition to employee privileges, the team leader can manage their team members, approve or reject leave requests for their team, and view team attendance statistics.
    \item \textbf{HR Administrator (RH):} The main administrator of the platform. The HR has full access to manage employees, generate payrolls, publish job posts, and utilize the AI module for performance analysis, absence prediction, and profile matching.
\end{itemize}

\subsection{Functional Requirements}
The functional requirements describe the specific behaviors and functions the system must support. They are divided into several core modules:
\begin{itemize}
    \item \textbf{Authentication and Authorization:} Secure login via JWT, role-based access control (RBAC).
    \item \textbf{User Management:} CRUD operations for employee records, assignment to teams and positions, and skill tracking.
    \item \textbf{Attendance Management (Pointage):} Daily clock-in and clock-out tracking, and working hours calculation.
    \item \textbf{Leave Management (Congés):} Submission of leave requests, validation workflow (Team Leader $\rightarrow$ HR), and leave balance tracking.
    \item \textbf{Payroll Management (Paie):} Automated calculation of monthly salaries based on base salary, working hours, and unpaid leaves.
    \item \textbf{Recruitment and Matching:} Creation of job posts, processing internal applications, and AI-driven matching of candidates to job requirements.
    \item \textbf{AI and Analytics:} Generation of employee performance scores, prediction of 7-day absence risks, and global KPI dashboards.
\end{itemize}

\subsection{Non-Functional Requirements}
To ensure the system is robust, scalable, and user-friendly, the following non-functional requirements are established:
\begin{itemize}
    \item \textbf{Performance:} The system must provide sub-second response times for standard queries. AI predictions must be processed efficiently without blocking standard operations.
    \item \textbf{Security:} Sensitive data (e.g., payroll, passwords) must be encrypted. Passwords must be hashed, and APIs must be protected via JWT tokens.
    \item \textbf{Usability:} The user interface must be intuitive, modern, and responsive, built with React and Tailwind CSS.
    \item \textbf{Maintainability:} Adopt a clean architecture (e.g., Repository pattern in Laravel, functional components in React) to facilitate future updates.
\end{itemize}

% ==================================================
\section{Global Architecture}

\subsection{Logical Architecture}
The system follows a modern microservices-inspired 3-tier architecture to separate concerns:
\begin{itemize}
    \item \textbf{Presentation Layer (Frontend):} A Single Page Application (SPA) built with React 18 and TypeScript. It communicates with the backend via RESTful APIs.
    \item \textbf{Business Logic Layer (Backend API):} Developed using Laravel 10 (PHP 8.2). It handles authentication, data processing, business rules, and acts as a proxy for the AI service.
    \item \textbf{Intelligence Layer (AI Service):} A dedicated microservice built with FastAPI and PyTorch (Python 3.9) that exposes endpoints for training models and generating predictions (performance, attendance, matching).
\end{itemize}

\subsection{Physical Architecture}
The physical deployment involves distinct independent environments (containerized via Docker in development):
\begin{itemize}
    \item \textbf{Client Device:} Web browser accessing the React application.
    \item \textbf{Web/App Server:} Hosts the Laravel backend (Port 8000).
    \item \textbf{AI Server:} Hosts the FastAPI service and PyTorch models (Port 8001).
    \item \textbf{Database Server:} PostgreSQL database (Port 5433) storing all transactional data.
\end{itemize}

% ==================================================
\section{Adopted Methodology}

To ensure flexibility and continuous improvement throughout the development lifecycle, we adopted the \textbf{Scrum} agile methodology.

\begin{itemize}
    \item \textbf{Sprints:} The development was divided into iterative cycles (Sprints) lasting two to three weeks, each culminating in a functional increment of the product.
    \item \textbf{Roles:} Product Owner (representing the stakeholders), Scrum Master, and the Development Team.
    \item \textbf{Ceremonies:} Sprint Planning to define the Sprint Backlog, Daily Stand-ups for synchronization, Sprint Review to demonstrate the increment, and Sprint Retrospective to identify process improvements.
\end{itemize}

% ==================================================
\section{Conceptual Modeling}

\subsection{Global Use Case Diagram}
The global use case diagram illustrates the interactions between our identified actors and the system's main functionalities. It highlights the boundary of the system and the specific privileges assigned to each role.

\begin{figure}[H]
    \centering
    % \includegraphics[width=0.9\textwidth]{tpl/img/global_use_case.png}
    \caption{Global Use Case Diagram}
    \label{fig:use_case}
\end{figure}

\subsection{Global Class Diagram}
The global class diagram represents the static structure of our database and the relationships between different entities such as Utilisateur (User), Pointage (Attendance), Conge (Leave), Paie (Payroll), and AI\_Recommendations.

\begin{figure}[H]
    \centering
    % \includegraphics[width=0.9\textwidth]{tpl/img/global_class_diagram.png}
    \caption{Global Class Diagram}
    \label{fig:class_diagram}
\end{figure}

% ==================================================
\section{Prototypes and Graphical Chart}

\textbf{Graphical Chart:} 
The user interface was designed with a focus on user experience. The color palette utilizes predominantly professional tones (shades of blue and modern gray) to inspire trust and clarity. Typography is clean and legible, relying on modern sans-serif fonts. The styling is powered by Tailwind CSS, combined with Lucide Icons for consistent visual cues.

\textbf{Prototypes:}
Before the actual implementation, high-fidelity mockups were created. These prototypes visualize the HR Dashboard, the attendance tracking interface, and the AI-driven recommendation screens, ensuring that the final product aligns perfectly with user expectations.

\begin{figure}[H]
    \centering
    % \includegraphics[width=0.8\textwidth]{tpl/img/prototype_dashboard.png}
    \caption{Mockup of the HR Dashboard}
    \label{fig:prototype_dashboard}
\end{figure}

% ==================================================
\section*{Conclusion}
\addcontentsline{toc}{section}{Conclusion}

This chapter laid the foundational design and specifications for our HR management system. We identified the key actors and compiled the functional and non-functional requirements vital for the platform's success. Furthermore, we detailed the physical and logical architectures, justified our use of the Scrum methodology, and modeled the system using UML diagrams. With a clear vision and structured design in place, the next chapters will detail the technical implementation and the realization of the various system modules.
