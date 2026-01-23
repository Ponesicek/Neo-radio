import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "./components/ui/button";
import { Slider } from "./components/ui/slider";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { X, ArrowRight } from "lucide-react";
import { Separator } from "./components/ui/separator";

export default function App() {
  return (
    <div className="h-screen w-full bg-gray-100 flex p-4 gap-4">
      <div className="flex gap-2 flex-col items-center min-w-sm">
        <h2 className="text-xl">How are we feeling?</h2>
        <Textarea
          id="textarea-message"
          placeholder="Type your message here."
          className="select-none"
        />
        <div className="flex flex-row w-full justify-end">
          <Button>Tune in</Button>
        </div>
        <div className="flex flex-row gap-2 w-full">
          <span className="min-w-fit">News frequency: </span>{" "}
          <Slider
            className="w-full "
            min={0}
            max={4}
            step={1}
            defaultValue={[0]}
          />
        </div>
        <Table>
          <TableBody>
            <TableRowComponent name="Metal" />
            <TableRowComponent name="Metal" />
            <TableRowComponent name="Metal" />
            <TableRowComponent name="Metal" />
            <TableRowComponent name="Metal" />
          </TableBody>
        </Table>
      </div>
      <Separator orientation="vertical" />
    </div>
  );
}

function TableRowComponent({ name }: { name: string }) {
  return (
    <TableRow>
      <TableCell className="font-medium w-full">{name}</TableCell>
      <TableCell>
        <button>
          <X size={16} />
        </button>
      </TableCell>
      <TableCell className="text-right">
        <button>
          <ArrowRight size={16} />
        </button>
      </TableCell>
    </TableRow>
  );
}
