import React from 'react';
import { cn } from '../../utils/cn';

const Table = React.forwardRef(({ className, children, ...props }, ref) => (
  <div className="overflow-x-auto">
    <table
      ref={ref}
      className={cn('w-full', className)}
      {...props}
    >
      {children}
    </table>
  </div>
));

Table.displayName = 'Table';

const TableHeader = React.forwardRef(({ className, children, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn('bg-gray-50', className)}
    {...props}
  >
    {children}
  </thead>
));

TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef(({ className, children, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('divide-y divide-gray-100', className)}
    {...props}
  >
    {children}
  </tbody>
));

TableBody.displayName = 'TableBody';

const TableRow = React.forwardRef(({ className, children, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn('hover:bg-gray-50 transition-colors', className)}
    {...props}
  >
    {children}
  </tr>
));

TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef(({ className, children, ...props }, ref) => (
  <th
    ref={ref}
    className={cn('text-left py-4 px-6 text-sm font-semibold text-gray-900', className)}
    {...props}
  >
    {children}
  </th>
));

TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef(({ className, children, ...props }, ref) => (
  <td
    ref={ref}
    className={cn('py-4 px-6', className)}
    {...props}
  >
    {children}
  </td>
));

TableCell.displayName = 'TableCell';

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
